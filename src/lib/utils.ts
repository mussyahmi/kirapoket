import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Named in-app browsers
  if (/Instagram|FBAN|FBAV|FB_IAB|Barcelona|IABMV|Twitter|TikTok|musical_ly|MicroMessenger|Line\/|LinkedIn|Snapchat|Pinterest/i.test(ua)) return true;
  // Android WebView (contains "wv" flag)
  if (/Android.*wv\)/i.test(ua)) return true;
  return false;
}
