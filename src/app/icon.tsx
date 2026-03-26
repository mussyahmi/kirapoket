import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4F46E5",
          borderRadius: "24%",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 220,
            fontWeight: 900,
            letterSpacing: "-8px",
            fontFamily: "sans-serif",
          }}
        >
          KP
        </span>
      </div>
    ),
    size
  );
}
