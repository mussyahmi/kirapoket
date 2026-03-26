import { NextResponse } from "next/server";

export const dynamic = "force-static";

const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "1";

const SW_CONTENT = `// KiraPoket Service Worker v${version}
const CACHE = "kirapoket-${version}";

self.addEventListener("install", (e) => {
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

self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const { hostname } = new URL(e.request.url);
  if (hostname.includes("firebase") || hostname.includes("google") || hostname.includes("googleapis")) return;

  if (e.request.mode === "navigate") {
    // Navigation: network first, fall back to cache
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached ?? Response.error()))
    );
  } else {
    // Assets: cache first, update in background
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const networkFetch = fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        });
        return cached ?? networkFetch;
      })
    );
  }
});
`;

export async function GET() {
  return new NextResponse(SW_CONTENT, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
