"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

// Background colors matching globals.css :root and .dark
const THEME_COLOR = {
  light: "#fefdf9",
  dark: "#1e1408",
};

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === "dark" ? THEME_COLOR.dark : THEME_COLOR.light;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", color);
  }, [resolvedTheme]);

  return null;
}
