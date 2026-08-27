import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KiraPoket – Expense Tracker",
    short_name: "KiraPoket",
    description: "Track your spending by salary cycle",
    start_url: "/",
    display: "standalone",
    // Deliberately not locking orientation — rotation is the user's call,
    // and the layout already handles landscape and tablet widths.
    // Both must match the design tokens: the splash screen is the first
    // thing an installed user sees, and it was rendering indigo-on-white
    // for a coral-on-cream app.
    background_color: "#fefdf9", // --background
    theme_color: "#d93400", // --primary
    icons: [
      // "any" and "maskable" are different jobs — supplying only maskable
      // means contexts expecting a plain icon crop into the safe zone.
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
