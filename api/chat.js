// api/chat.js
// Server-side proxy to the Gemini API. The API key lives in a Vercel environment
// variable and is NEVER exposed to the browser.
//
// Provider is swappable: change PROVIDER + the callX function and nothing else
// in the app needs to change.

const PROVIDER = process.env.AI_PROVIDER || "gemini";

const MODELS = {
  primary: "gemini-3.1-flash-lite",
  fallback: "gemini-3.6-flash", // used automatically if primary is rate-limited
};

async function callGemini(model, systemPrompt, messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in Netlify environment variables");

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
