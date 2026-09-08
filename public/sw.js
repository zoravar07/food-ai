// hungryvar service worker.
//
// The rule that matters: he deploys constantly and must never be stuck on a
// stale build. So the HTML is ALWAYS fetched from the network first. Vite gives
// every bundle a content hash, so a fresh index.html is the only thing needed to
// pull in fresh code — the hashed assets under /assets/ are immutable and safe
// to serve from cache forever.
//
// Offline is the fallback, never the preference: every strategy here tries the
// network first and only reaches for the cache when that fails.

const VERSION = "hv-3";
const SHELL = `${VERSION}-shell`;   // index.html
const ASSETS = `${VERSION}-assets`; // hashed js/css, icons, manifest
const DATA = `${VERSION}-data`;     // Supabase reads, so the plan opens offline

const KEEP = [SHELL, ASSETS, DATA];

self.addEventListener("install", (e) => {
  // Take over immediately rather than waiting for every tab to close.
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then((c) => c.add("/")).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Let the page ask for an immediate handover after it spots an update.
self.addEventListener("message", (e) => { if (e.data === "skip-waiting") self.skipWaiting(); });

const isAsset = (url) => url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")
  || url.pathname === "/manifest.json" || url.pathname.endsWith(".svg");
const isSupabaseRead = (url) => url.pathname.startsWith("/rest/v1/");

async function networkFirst(req, cacheName) {
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) (await caches.open(cacheName)).put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;                 // never touch writes
  const url = new URL(request.url);

  // The chat function must always be live; a cached answer is worse than none.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network first, so a deploy is picked up on the next launch.
  if (request.mode === "navigate") {
    e.respondWith(networkFirst(request, SHELL).catch(() => caches.match("/")));
    return;
  }

  if (url.origin === self.location.origin && isAsset(url)) {
    // Content-hashed and immutable: cache first, and fill the cache on a miss.
    e.respondWith((async () => {
      const hit = await caches.match(request);
      if (hit) return hit;
      const fresh = await fetch(request);
      if (fresh && fresh.ok) (await caches.open(ASSETS)).put(request, fresh.clone());
      return fresh;
    })());
    return;
  }

  // Supabase reads: network first so he never sees stale data while online,
  // cached only so the plan and pantry still render with no signal.
  if (isSupabaseRead(url)) {
    e.respondWith(networkFirst(request, DATA).catch(() => new Response("[]", { headers: { "Content-Type": "application/json" } })));
  }
});
