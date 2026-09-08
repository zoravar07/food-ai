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

const MODELS = {
  primary: "gemini-3.1-flash-lite",
  fallback: "gemini-3.6-flash", // used automatically if primary is rate-limited
};

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

  if (res.status === 429) {
    const err = new Error("rate_limited");
    err.rateLimited = true;
    throw err;
  }
  // 404 means the model was retired or renamed — fall back instead of failing.
  if (res.status === 404) {
    const err = new Error("model_unavailable");
    err.shouldFallback = true;
    throw err;
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
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
    try {
      text = await callGemini(MODELS.primary, systemPrompt || "", messages);
    } catch (e) {
      if (e.rateLimited || e.shouldFallback) {
        // Automatic fallback to the higher-quota model rather than failing
        text = await callGemini(MODELS.fallback, systemPrompt || "", messages);
      } else {
        throw e;
      }
    }

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
