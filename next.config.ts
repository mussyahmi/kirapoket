import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  turbopack: {},
  // Firebase Hosting serves this app statically, so there is no /_next/image
  // optimizer behind it — every optimized <Image> 404s in production.
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  // In production, Firebase Hosting rewrites /api/chat to the standalone
  // Cloud Function. The dev server has no such rewrite, so without this the
  // path 404s locally and the assistant looks broken. Points at the deployed
  // function, which is also what the emulator alternative would replace.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/chat",
        destination: "https://us-central1-kira-poket.cloudfunctions.net/chat",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
