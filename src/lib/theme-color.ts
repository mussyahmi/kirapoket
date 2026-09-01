// Status bar / browser chrome colours, matching globals.css :root and .dark.
//
// Lives in lib rather than beside ThemeColorSync because three places need it
// across the server/client boundary: the root layout's `viewport` export (a
// server module), the pre-paint inline script, and the client sync component.
// Importing it from a "use client" module made Next drop the theme-color meta
// from the SSR output entirely.
export const THEME_COLOR = {
  light: "#fefdf9",
  dark: "#1e1408",
};
