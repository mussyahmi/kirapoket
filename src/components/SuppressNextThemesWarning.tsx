"use client";

import { useEffect } from "react";

// next-themes v0.4.x injects an inline <script> for theme init (prevents FOUC).
// React 19 warns about script tags inside component trees. The warning is
// cosmetic — the script runs during SSR before hydration and the app works
// correctly. This component filters the specific warning until next-themes
// ships a React 19-compatible fix.
export function SuppressNextThemesWarning() {
  useEffect(() => {
    const orig = console.error;
    console.error = (...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("Encountered a script tag while rendering React")
      )
        return;
      orig(...args);
    };
    return () => {
      console.error = orig;
    };
  }, []);

  return null;
}
