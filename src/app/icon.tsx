import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/common/LogoMark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Hex, not CSS variables: ImageResponse renders outside the browser.
// #d93400 is --primary (oklch(0.58 0.207 35)) in sRGB.
export default function Icon() {
  return new ImageResponse(
    <LogoMark size={512} tile="#d93400" ink="#ffffff" radius={24} />,
    size,
  );
}
