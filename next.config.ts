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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
