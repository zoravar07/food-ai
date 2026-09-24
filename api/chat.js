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

// Tried in order until one answers. flash-lite is the cheaper model and was
// first here, but it has answered 503 to every request for as long as anyone
// has looked, and a dead model at the head of the list costs a doomed round
// trip on every message. It stays in the chain in case it comes back.
const MODELS = ["gemini-3.6-flash", "gemini-3.1-flash-lite"];

// Statuses where the next model is worth a try: the request itself is fine,
// this particular model just cannot serve it right now. 429 is a rate limit,
// 404 means retired or renamed, and the 5xx range is an outage on Google's
// side. 503 ("this model is currently experiencing high demand") is what took
// the assistant down, and it was the one status the old fallback missed.
const TRY_NEXT = new Set([404, 429, 500, 502, 503, 504]);

async function callGemini(model, systemPrompt, messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in Vercel environment variables");

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.7 },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`${model} returned ${res.status}: ${body.replace(/\s+/g, " ").slice(0, 200)}`);
    err.status = res.status;
    err.tryNext = TRY_NEXT.has(res.status);
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return text;
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

    let text;
    const failures = [];
    for (const model of MODELS) {
      try {
        text = await callGemini(model, systemPrompt || "", messages);
        break;
      } catch (e) {
        failures.push(e.message);
        // A missing key or a malformed request fails identically on every
        // model, so working through the list would only waste the round trips.
        if (!e.tryNext) throw e;
      }
    }

    // Worth a log line either way: a silent fallback still means the primary
    // model is unhealthy, and that is the thing worth noticing early.
    if (failures.length) console.warn(`chat: ${failures.join(" | ")}`);

    if (text === undefined) {
      // Every model was unavailable. Raw provider JSON in a chat bubble tells
      // him nothing he can act on, so say what happened in plain words.
      return res.status(503).json({
        error: "the AI provider is down right now — try again in a minute",
      });
    }

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
