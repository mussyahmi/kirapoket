import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/common/LogoMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Full-bleed (radius 0) — iOS applies its own rounded mask to home-screen icons.
export default function AppleIcon() {
  return new ImageResponse(
    <LogoMark size={180} tile="#d93400" ink="#ffffff" radius={0} />,
    size,
  );
}
