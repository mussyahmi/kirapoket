"use client";

/**
 * Catches errors thrown by the root layout itself, so it must render its own
 * <html>/<body> — globals.css and the theme provider are not available here.
 * Colours are inlined from the design tokens for that reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
          textAlign: "center",
          background: "#fefdf9",
          color: "#282019",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#d93400",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 900,
          }}
        >
          KP
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          KiraPoket couldn&apos;t start
        </h1>
        <p
          style={{
            maxWidth: "34ch",
            fontSize: 14,
            color: "#7b6f67",
            margin: 0,
          }}
        >
          Your data is safe. Reloading usually clears this.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            height: 44,
            padding: "0 24px",
            borderRadius: 8,
            border: "none",
            background: "#d93400",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
        {error.digest && (
          <p
            style={{
              fontSize: 12,
              color: "#7b6f67",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            Ref: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
