"use client";

// next-themes v0.4.x injects an inline <script> for theme init (prevents FOUC).
// React 19 / Next 16 warns about script tags inside component trees. The warning
// is cosmetic — the script runs during SSR before hydration and the app works
// correctly; it never appears in production.
//
// Patch at module-eval time (during the client bootstrap, before React's first
// render) so the warning emitted on the very first render is caught too — an
// effect-based patch only installs after mount and misses that first one.
if (typeof window !== "undefined") {
  const w = window as unknown as { __kpThemeWarnPatched?: boolean };
  if (!w.__kpThemeWarnPatched) {
    w.__kpThemeWarnPatched = true;
    const orig = console.error;
    console.error = (...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("Encountered a script tag while rendering React")
      )
        return;
      orig(...args);
    };
  }
}

export function SuppressNextThemesWarning() {
  return null;
}
