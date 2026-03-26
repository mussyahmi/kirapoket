// KiraPoket Service Worker
const CACHE = "kirapoket-v1";

self.addEventListener("install", (e) => {
  // Do NOT skipWaiting here — wait for user to confirm update
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(["/", "/home", "/manifest.webmanifest"]))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Allow the page to trigger activation (after user confirms update)
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const { hostname } = new URL(e.request.url);
  if (hostname.includes("firebase") || hostname.includes("google") || hostname.includes("googleapis")) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => cached ?? Response.error());
      return e.request.mode === "navigate" ? networkFetch : cached ?? networkFetch;
    })
  );
});
