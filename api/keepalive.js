// api/keepalive.js
// Supabase's free tier pauses a project after a week with no activity, and a
// paused project is what signed him out and broke the app in October. A
// Vercel cron calls this once a day; one tiny read through the API counts as
// activity. It reads nothing private: row-level security returns no rows to
// a request with no session.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ ok: false, error: "Supabase env vars missing" });
  try {
    const r = await fetch(`${url}/rest/v1/profile?select=id&limit=1`, { headers: { apikey: key } });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e.message || e) });
  }
}
