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
