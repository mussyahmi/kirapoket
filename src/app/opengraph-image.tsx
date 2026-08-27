import { ImageResponse } from "next/og";

export const alt = "KiraPoket — Know where your money goes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// sRGB equivalents of the design tokens (see src/lib/pdf.ts for the same note):
// ImageResponse renders outside the browser, so it can't read CSS variables.
const CREAM = "#FDFCFA";
const INK = "#282019";
const MUTED = "#7B6F67";
const BRAND = "#d93400";
const LINE = "#E6E0D9";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: CREAM,
        padding: "72px 80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Brand lockup */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: BRAND,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: "-1px",
          }}
        >
          KP
        </div>
        <span
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: INK,
            letterSpacing: "-1px",
          }}
        >
          KiraPoket
        </span>
      </div>

      {/* Headline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <span
          style={{
            fontSize: 82,
            fontWeight: 800,
            color: INK,
            letterSpacing: "-3px",
            lineHeight: 1.05,
            maxWidth: 900,
          }}
        >
          Know where your money goes.
        </span>
        <span
          style={{ fontSize: 32, color: MUTED, maxWidth: 820, lineHeight: 1.4 }}
        >
          Track spending by your salary cycle, not the calendar.
        </span>
      </div>

      {/* Footer rule + descriptors */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          borderTop: `2px solid ${LINE}`,
          paddingTop: 28,
          fontSize: 26,
          color: MUTED,
        }}
      >
        <span style={{ color: BRAND, fontWeight: 700 }}>Free</span>
        <span>·</span>
        <span>Malaysian-made</span>
        <span>·</span>
        <span>Needs · Wants · Savings</span>
      </div>
    </div>,
    size,
  );
}
