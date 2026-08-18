// netlify/functions/chat.js
// Server-side proxy to the Gemini API. The API key lives in a Netlify environment
// variable and is NEVER exposed to the browser.
//
// Provider is swappable: change PROVIDER + the callX function and nothing else
// in the app needs to change.

const PROVIDER = process.env.AI_PROVIDER || "gemini";

const MODELS = {
  primary: "gemini-2.5-flash",
  fallback: "gemini-2.5-flash-lite", // used automatically if primary is rate-limited
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
      }),
    }
  );

  if (res.status === 429) {
    const err = new Error("rate_limited");
    err.rateLimited = true;
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

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { systemPrompt, messages } = JSON.parse(event.body || "{}");
    if (!Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "messages required" }) };
    }

    let text;
    try {
      text = await callGemini(MODELS.primary, systemPrompt || "", messages);
    } catch (e) {
      if (e.rateLimited) {
        // Automatic fallback to the higher-quota model rather than failing
        text = await callGemini(MODELS.fallback, systemPrompt || "", messages);
      } else {
        throw e;
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unknown error" }),
    };
  }
}
