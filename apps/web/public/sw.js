// Service worker: strony – network-first z kopią offline; zasoby statyczne – cache-first. API nie jest buforowane.
const CACHE = "zpr-v1";
const PRECACHE = ["/", "/przewodnik", "/wsparcie", "/manifest.webmanifest", "/icon-192.png"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req).then((r) => r || caches.match("/"))));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname))
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
});
