// api/chat.js
// Server-side proxy to the Gemini API. The API key lives in a Vercel environment
// variable and is NEVER exposed to the browser.
//
// Provider is swappable: change PROVIDER + the callX function and nothing else
// in the app needs to change.

const PROVIDER = process.env.AI_PROVIDER || "gemini";

// The Gemini key is server-side, but the endpoint holding it was open to anyone
// who knew the URL — so the key was private and the spending wasn't. Every
// request now has to carry a live Supabase session.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;

/** The signed-in user behind this request, or null. Asks Supabase rather than
 *  checking the signature locally: it costs one fast round trip and, unlike a
 *  local check, it honours sign-outs and deleted accounts immediately. */
async function userFor(req) {
  // Missing config must fail closed. Treating it as "skip the check" would
  // silently reopen the hole the next time an env var goes astray.
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;

  const header = req.headers.authorization || req.headers.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    // The anon key is itself a valid JWT but belongs to no user, so the id is
    // what actually distinguishes a session from "any well-formed token".
    return user && user.id ? user : null;
  } catch {
    return null;
  }
}

// Tried in order until one answers. Chosen by testing every model this key
// can see (Nov 2026), with the real action instructions:
// - gemini-3.5-flash-lite: answered every request, ~1-6s, emits the right
//   action blocks. Highest free allowance of the three, so it goes first.
// - gemini-3-flash-preview: the most accurate, ~2-3s, but answers "high
//   demand" (503) on roughly one request in three.
// - gemini-3.6-flash: good but slow (5-20s) and only 20 free requests a day,
//   shared with gemini-3.5-flash. Last resort.
// gemini-3.1-flash-lite answers too but took up to 43s, so it isn't here.
const MODELS = ["gemini-3.5-flash-lite", "gemini-3-flash-preview", "gemini-3.6-flash"];

// Each model gets this long before the next one is tried, and the whole chain
// stops here so the app is never left waiting on a dead assistant.
const PER_MODEL_MS = 20000;
const TOTAL_MS = 45000;

// A model that has used its daily allowance stays used until it resets, so
// there's no point asking it again on every message. Remembered for as long
// as this server instance lives.
const exhaustedUntil = {};

/** Gemini says which quota ran out. A per-day one means the model is gone
 *  until the reset; anything else (per minute, tokens) clears in a minute. */
function quotaKind(body) {
  if (/PerDay/i.test(body)) return "day";
  return "minute";
}

function retrySeconds(body) {
  const m = body.match(/"retryDelay":\s*"(\d+)s"/);
  return m ? Number(m[1]) : 3600;
}

async function callGemini(model, systemPrompt, messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error("GEMINI_API_KEY is not set in Vercel environment variables"), { fatal: true });

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(PER_MODEL_MS),
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7 },
        }),
      }
    );
  } catch (e) {
    throw Object.assign(new Error(`${model} timed out or was unreachable`), { kind: "busy" });
  }

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`${model} returned ${res.status}: ${body.replace(/\s+/g, " ").slice(0, 200)}`);
    if (res.status === 429) {
      err.kind = quotaKind(body) === "day" ? "quota-day" : "busy";
      if (err.kind === "quota-day") exhaustedUntil[model] = Date.now() + retrySeconds(body) * 1000;
    } else if (res.status === 404 || res.status >= 500) {
      err.kind = "busy";        // retired, renamed, overloaded or down: try the next
    } else {
      err.fatal = true;         // a malformed request fails the same on every model
    }
    throw err;
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await userFor(req);
  if (!user) {
    return res.status(401).json({ error: "Sign in to use the assistant" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { systemPrompt, messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages required" });
    }

    let text, model;
    const failures = [];
    const started = Date.now();
    for (const m of MODELS) {
      if (exhaustedUntil[m] > Date.now()) { failures.push({ model: m, kind: "quota-day" }); continue; }
      if (Date.now() - started > TOTAL_MS) break;
      try {
        text = await callGemini(m, systemPrompt || "", messages);
        model = m;
        break;
      } catch (e) {
        if (e.fatal) throw e;
        failures.push({ model: m, kind: e.kind, msg: e.message });
      }
    }

    // Worth a log line either way: a silent fallback still means a model in
    // the chain is unhealthy, and that is the thing worth noticing early.
    if (failures.length) console.warn(`chat: ${failures.map((f) => f.msg || `${f.model} skipped (${f.kind})`).join(" | ")}`);

    if (text === undefined) {
      // Plain words he can act on. Out of quota means come back tomorrow;
      // anything else means try again shortly.
      const allQuota = failures.length === MODELS.length && failures.every((f) => f.kind === "quota-day");
      return res.status(allQuota ? 429 : 503).json({
        code: allQuota ? "quota" : "busy",
        error: allQuota
          ? "The assistant is out of free quota for today. It's back tomorrow (the allowance resets at 8am UK time). Everything else in the app still works."
          : "The assistant's free models are all busy right now. Try again in a minute. Everything else in the app still works.",
      });
    }

    return res.status(200).json({ text, model });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
