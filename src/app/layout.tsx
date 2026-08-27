import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/PwaRegister";
import { ThemeColorSync } from "@/components/ThemeColorSync";
import { SuppressNextThemesWarning } from "@/components/SuppressNextThemesWarning";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#fefdf9",
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
    statusBarStyle: "black",
    title: "KiraPoket",
  },
  formatDetection: { telephone: false },
};

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
