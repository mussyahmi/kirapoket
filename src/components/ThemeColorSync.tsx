"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { THEME_COLOR } from "@/lib/theme-color";


export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color =
      resolvedTheme === "dark" ? THEME_COLOR.dark : THEME_COLOR.light;

    // Replace the tag rather than setAttribute("content", …) on it. WebKit
    // re-samples theme-color when a meta[name=theme-color] is inserted or
    // removed, but frequently ignores an in-place content mutation — which is
    // why iOS kept the old status bar tint while the page itself repainted.
    // Safe only because no theme-color meta is React-owned: ThemeColorInit
    // creates it, and the root viewport export deliberately omits themeColor.
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.remove());

    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", color);
    document.head.appendChild(meta);
  }, [resolvedTheme]);

  return null;
}
