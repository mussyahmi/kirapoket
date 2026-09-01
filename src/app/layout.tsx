import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/PwaRegister";
import { ThemeColorSync } from "@/components/ThemeColorSync";
import { THEME_COLOR } from "@/lib/theme-color";
import { SuppressNextThemesWarning } from "@/components/SuppressNextThemesWarning";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  // The light value is only the SSR placeholder — themeColor cannot be
  // theme-aware here (enableSystem is false, so prefers-color-scheme says
  // nothing about the user's stored choice). ThemeColorInit below corrects it
  // during HTML parse; ThemeColorSync keeps it correct after that.
  themeColor: THEME_COLOR.light,
  // Deliberately NOT locking scale — this app is read as small numbers, and
  // blocking pinch-zoom fails WCAG 1.4.4.
};

export const metadata: Metadata = {
  metadataBase: new URL("https://kirapoket.web.app"),
  title: "KiraPoket – Expense Tracker",
  description: "Track your spending by salary cycle",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "KiraPoket – Expense Tracker",
    description:
      "Track spending by your salary cycle, not the calendar. Organise every cent into Needs, Wants, and Savings.",
    siteName: "KiraPoket",
    type: "website",
    locale: "en_MY",
  },
  twitter: {
    card: "summary_large_image",
    title: "KiraPoket – Expense Tracker",
    description: "Track spending by your salary cycle, not the calendar.",
  },
  appleWebApp: {
    capable: true,
    // NOT "black": that pins the standalone status bar to opaque black, so it
    // stayed dark while the app repainted in light mode. "default" lets iOS
    // tint the bar from the live theme-color meta (kept in sync by
    // ThemeColorSync) and pick legible glyphs for it. Deliberately not
    // "black-translucent" — that extends the web view under the status bar,
    // and nothing in the app pads for safe-area-inset-top.
    statusBarStyle: "default",
    title: "KiraPoket",
  },
  formatDetection: { telephone: false },
};

// Runs during HTML parse, before the first paint, alongside the inline script
// next-themes uses to set the `dark` class. Without it a dark-mode user cold-
// launching the PWA gets a cream status bar until hydration finishes, because
// the SSR themeColor above can only carry one value. Reads the same
// localStorage key next-themes writes, so the two agree on the very first frame.
function ThemeColorInit() {
  const js = `try{var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',localStorage.getItem('theme')==='dark'?'${THEME_COLOR.dark}':'${THEME_COLOR.light}')}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <ThemeColorInit />
          <ThemeColorSync />
          <SuppressNextThemesWarning />
          <AuthProvider>
            <AppProvider>
              {children}
              <Toaster position="top-center" />
              <PwaRegister />
            </AppProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
