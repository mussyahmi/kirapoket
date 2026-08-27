"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import PullToRefresh from "@/components/common/PullToRefresh";
import { isInAppBrowser } from "@/lib/utils";
import { L1_COLOR, ACCOUNT_COLOR, tint } from "@/lib/palette";
import { CycleSummaryCard } from "@/components/dashboard/CycleSummaryCard";
import {
  Wallet,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronDown,
  SignalHigh,
  Wifi,
  BatteryFull,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboardIcon,
  LogOutIcon,
  ExternalLink,
  Smartphone,
  Download,
  Sparkles,
  HandCoins,
  Target,
  Users,
} from "lucide-react";

// ─── Google logo SVG ─────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="size-5 shrink-0"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

// ─── Mock dashboard preview ───────────────────────────────────────────────────
const MOCK_PIE = [
  { label: "Needs", value: 630, color: L1_COLOR.needs },
  { label: "Wants", value: 225, color: L1_COLOR.wants },
  { label: "Savings", value: 300, color: L1_COLOR.savings },
];
const MOCK_PIE_TOTAL = MOCK_PIE.reduce((s, d) => s + d.value, 0);

const MOCK_ACCOUNTS = [
  { name: "Maybank", balance: "RM 2,840.00", color: ACCOUNT_COLOR.bank },
  { name: "Touch 'n Go", balance: "RM 150.00", color: ACCOUNT_COLOR.ewallet },
  { name: "Tabung ASB", balance: "RM 4,200.00", color: ACCOUNT_COLOR.savings },
];

type MockDelta = { direction: "up" | "down"; amount: string; color: string };

const MOCK_L1: {
  label: string;
  spent: string;
  dot: string;
  border: string;
  delta?: MockDelta;
  l2: {
    name: string;
    spent: string;
    delta?: MockDelta;
    l3: { name: string; spent: string; delta?: MockDelta }[];
  }[];
}[] = [
  {
    label: "Needs",
    spent: "RM 630.00",
    dot: L1_COLOR.needs,
    border: tint(L1_COLOR.needs, 40),
    delta: { direction: "down", amount: "RM 80", color: "text-success" },
    l2: [
      {
        name: "Food & Drinks",
        spent: "RM 420.00",
        delta: { direction: "down", amount: "RM 50", color: "text-success" },
        l3: [
          {
            name: "Groceries",
            spent: "RM 260.00",
            delta: {
              direction: "down",
              amount: "RM 30",
              color: "text-success",
            },
          },
          {
            name: "Work Meals",
            spent: "RM 160.00",
            delta: {
              direction: "down",
              amount: "RM 20",
              color: "text-success",
            },
          },
        ],
      },
      {
        name: "Transport",
        spent: "RM 210.00",
        l3: [
          { name: "Fuel", spent: "RM 150.00" },
          { name: "Parking & Toll", spent: "RM 60.00" },
        ],
      },
    ],
  },
  {
    label: "Wants",
    spent: "RM 225.00",
    dot: L1_COLOR.wants,
    border: tint(L1_COLOR.wants, 40),
    delta: { direction: "up", amount: "RM 35", color: "text-danger" },
    l2: [
      {
        name: "Dining Out",
        spent: "RM 180.00",
        delta: { direction: "up", amount: "RM 30", color: "text-danger" },
        l3: [
          {
            name: "Restaurants",
            spent: "RM 120.00",
            delta: { direction: "up", amount: "RM 20", color: "text-danger" },
          },
          {
            name: "Cafes",
            spent: "RM 60.00",
            delta: { direction: "up", amount: "RM 10", color: "text-danger" },
          },
        ],
      },
      {
        name: "Subscriptions",
        spent: "RM 45.00",
        l3: [
          { name: "Spotify", spent: "RM 17.90" },
          { name: "Netflix", spent: "RM 27.10" },
        ],
      },
    ],
  },
  {
    label: "Savings",
    spent: "RM 300.00",
    dot: L1_COLOR.savings,
    border: tint(L1_COLOR.savings, 40),
    l2: [
      {
        name: "Goals",
        spent: "RM 300.00",
        l3: [
          { name: "Emergency Fund", spent: "RM 200.00" },
          { name: "Travel", spent: "RM 100.00" },
        ],
      },
    ],
  },
];

const MOCK_RECENT = [
  {
    group: "Today",
    txs: [
      {
        name: "Work Meals",
        sub: "Maybank · Office lunch",
        amount: "-RM 18.50",
        income: false,
      },
      {
        name: "Parking",
        sub: "Maybank · MRT Sungai Buloh",
        amount: "-RM 10.00",
        income: false,
      },
    ],
  },
  {
    group: "Yesterday",
    txs: [
      { name: "Salary", sub: "Maybank", amount: "+RM 4,500.00", income: true },
      {
        name: "Snacks & Drinks",
        sub: "Touch 'n Go · ZUS Coffee",
        amount: "-RM 27.60",
        income: false,
      },
    ],
  },
];

function MockCard({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10">
      {title && (
        <div className="px-4 pb-3">
          <p className="font-heading text-base leading-snug font-medium">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
      <div className="px-4">{children}</div>
    </div>
  );
}

// A true-scale replica of the dashboard — cropped at the bottom rather than
// shrunk, so every value here comes from the same type and spacing scale the
// real app uses instead of a set of one-off sub-12px sizes.
function MockDashboard() {
  return (
    <div className="relative mx-auto w-full max-w-sm md:mx-0 md:w-[417px] md:max-w-none">
      {/* Device frame — md+ only. A phone frame on a phone is redundant, and on
          a narrow viewport the bezel would eat usable width. The bezel sits
          outside the screen so the app inside stays at true scale. */}
      <div className="relative md:bg-device-bezel md:rounded-[2.75rem] md:p-3 md:shadow-e5">
        <span
          aria-hidden
          className="absolute top-[7px] left-1/2 hidden h-1 w-14 -translate-x-1/2 rounded-full bg-white/20 md:block"
        />
        <div className="mock-window relative overflow-hidden rounded-2xl border border-border bg-background shadow-e5 select-none md:rounded-[2rem] md:border-0 md:shadow-none">
          {/* Faux status bar — sells the device and covers the panning cut edge */}
          <div className="text-foreground absolute inset-x-0 top-0 z-10 hidden items-center justify-between bg-background/80 px-4 py-2 text-xs font-medium backdrop-blur-sm md:flex">
            <span>9:41</span>
            <span className="flex items-center gap-2">
              <SignalHigh className="size-3.5" />
              <Wifi className="size-3.5" />
              <BatteryFull className="size-4" />
            </span>
          </div>
          <div className="mock-pan space-y-4 p-3 md:pt-12">
          {/* cycle selector */}
          <div className="flex items-center justify-between px-1">
            <ChevronLeft className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              25 Mar – 24 Apr 2026
            </p>
            <span className="inline-flex h-7 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium">
              <Download className="size-3.5" /> Report
            </span>
          </div>

          {/* summary — literally the same component the dashboard renders,
              so the marketing shot cannot drift from the product */}
          <CycleSummaryCard
            remaining={2190}
            income={4500}
            expenses={2310}
            hasPrev
            prevRemaining={1845}
            prevIncome={4300}
            prevExpenses={2455}
          />

          {/* accounts */}
          <MockCard title="Accounts">
            <div className="space-y-3">
              {MOCK_ACCOUNTS.map(({ name, balance, color }) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-sm text-foreground">
                      {name}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {balance}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-sm font-medium">Total</span>
                <span className="text-sm font-semibold tabular-nums">
                  RM 7,190.00
                </span>
              </div>
            </div>
          </MockCard>

          {/* spending by category */}
          <MockCard
            title="Spending by Category"
            subtitle="vs previous full cycle"
          >
            <div className="space-y-4">
              <div className="space-y-3 border-b border-border pb-3">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  {MOCK_PIE.map(({ color, value, label }) => (
                    <span
                      key={label}
                      style={{
                        width: `${(value / MOCK_PIE_TOTAL) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                  {MOCK_PIE.map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span>
                        {label} {Math.round((value / MOCK_PIE_TOTAL) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {MOCK_L1.map(({ label, spent, dot, border, delta, l2 }) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: dot }}
                      />
                      <span className="text-sm font-semibold">{label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-sm tabular-nums">{spent}</span>
                      <span
                        className={`inline-flex w-20 items-center justify-end gap-0.5 text-xs tabular-nums ${delta?.color ?? ""}`}
                      >
                        {delta &&
                          (delta.direction === "up" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          ))}
                        {delta?.amount ?? ""}
                      </span>
                    </span>
                  </div>
                  <div
                    className="space-y-2 border-l-2 pl-4"
                    style={{ borderColor: border }}
                  >
                    {l2.map(({ name, spent: l2spent, delta: l2delta, l3 }) => (
                      <div key={name} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="min-w-0 truncate">{name}</span>
                          <span className="flex shrink-0 items-center gap-3">
                            <span className="tabular-nums">{l2spent}</span>
                            <span
                              className={`inline-flex w-20 items-center justify-end gap-0.5 tabular-nums ${l2delta?.color ?? ""}`}
                            >
                              {l2delta &&
                                (l2delta.direction === "up" ? (
                                  <ArrowUp className="size-3" />
                                ) : (
                                  <ArrowDown className="size-3" />
                                ))}
                              {l2delta?.amount ?? ""}
                            </span>
                          </span>
                        </div>
                        {l3.length > 0 && (
                          <div className="space-y-0.5 border-l border-border pl-3">
                            {l3.map(
                              ({
                                name: l3name,
                                spent: l3spent,
                                delta: l3delta,
                              }) => (
                                <div
                                  key={l3name}
                                  className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                                >
                                  <span className="min-w-0 truncate">
                                    {l3name}
                                  </span>
                                  <span className="flex shrink-0 items-center gap-3">
                                    <span className="tabular-nums">
                                      {l3spent}
                                    </span>
                                    <span
                                      className={`inline-flex w-20 items-center justify-end gap-0.5 tabular-nums ${l3delta?.color ?? ""}`}
                                    >
                                      {l3delta &&
                                        (l3delta.direction === "up" ? (
                                          <ArrowUp className="size-3" />
                                        ) : (
                                          <ArrowDown className="size-3" />
                                        ))}
                                      {l3delta?.amount ?? ""}
                                    </span>
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </MockCard>

          {/* recent transactions */}
          <MockCard title="Recent Transactions">
            <div className="space-y-3">
              {MOCK_RECENT.map(({ group, txs }) => (
                <div key={group}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {group}
                  </p>
                  <div className="space-y-0.5">
                    {txs.map(({ name, sub, amount, income }) => (
                      <div
                        key={name + sub}
                        className="flex items-center gap-3 py-2"
                      >
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${income ? "bg-success-soft text-success-strong" : "bg-danger-soft text-danger-strong"}`}
                        >
                          {income ? (
                            <ArrowDownRight className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {sub}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-sm font-semibold tabular-nums ${income ? "text-success" : "text-danger"}`}
                        >
                          {amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </MockCard>
          </div>
          {/* Soften both cut edges so the window reads as a viewport, not a crop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-background/70 to-transparent md:top-8 md:h-6"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/90 to-transparent md:h-10"
          />
          <span
            aria-hidden
            className="absolute bottom-2 left-1/2 hidden h-1 w-28 -translate-x-1/2 rounded-full bg-foreground/25 md:block"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 items-start p-4 rounded-xl border border-border bg-card/60">
      <div className="shrink-0 size-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}

// ─── Install banner ───────────────────────────────────────────────────────────
type InstallPlatform = "android" | "ios";

function InstallBanner() {
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = navigator.userAgent;
    const isIOS =
      /iPhone|iPad|iPod/i.test(ua) &&
      !(window as { MSStream?: unknown }).MSStream;
    const isAndroid = /Android/i.test(ua);

    if (isAndroid) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setPlatform("android");
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }

    if (isIOS) {
      // Only show in Safari — Chrome/Firefox for iOS can't install PWAs
      const isSafari =
        /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);
      if (isSafari) setPlatform("ios");
    }
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setPlatform(null);
  };

  if (!platform) return null;

  return (
    <div className="flex gap-3 items-start p-4 rounded-xl border border-border bg-card/60">
      <div className="shrink-0 size-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Smartphone className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Add to Home Screen
        </p>
        {platform === "android" ? (
          <div className="mt-2">
            <button
              onClick={handleAndroidInstall}
              className="inline-flex items-center gap-2 h-8 pointer-coarse:h-11 rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-3 hover:bg-primary/90 transition-colors"
            >
              <Download className="size-3.5" />
              Install app
            </button>
          </div>
        ) : (
          <ol className="text-xs text-muted-foreground mt-1 leading-relaxed space-y-0.5">
            <li>
              1. Tap the{" "}
              <span className="font-medium text-foreground">Share</span> button
              (⬆︎) in Safari&apos;s toolbar
            </li>
            <li>
              2. Scroll and tap{" "}
              <span className="font-medium text-foreground">
                &ldquo;Add to Home Screen&rdquo;
              </span>
            </li>
            <li>
              3. Tap{" "}
              <span className="font-medium text-foreground">
                &ldquo;Add&rdquo;
              </span>{" "}
              to confirm
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function InAppBrowserBanner() {
  const url =
    typeof window !== "undefined"
      ? window.location.href
      : "https://kirapoket.web.app";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-warning/35 bg-warning-soft p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <ExternalLink className="size-5 shrink-0 text-warning-strong mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-warning-strong">
            Open in your browser to sign in
          </p>
          <p className="text-xs text-warning-strong/80 leading-relaxed">
            Google sign-in is blocked in this in-app browser. Open KiraPoket in
            Safari or Chrome to continue.
          </p>
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-warning text-warning-soft text-sm font-semibold px-4 hover:bg-warning-strong transition-colors w-full"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

function useTyping(text: string, speed = 55, delay = 0) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const start = setTimeout(() => {
      const id = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(id);
      }, speed);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(start);
  }, [text, speed, delay]);
  return displayed;
}

export default function LandingPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { userProfile } = useApp();
  const [inAppBrowser, setInAppBrowser] = useState(false);

  useEffect(() => {
    setInAppBrowser(isInAppBrowser());
  }, []);

  const handleSignIn = async () => {
    if (inAppBrowser) return;
    try {
      await signInWithGoogle();
    } catch {
      toast.error("Failed to sign in. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast.error("Failed to sign out.");
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split("")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const greeting = userProfile?.salaryDay ? "Welcome back," : "Welcome,";
  const typedGreeting = useTyping(user ? greeting : "", 55, 500);
  const displayName = user
    ? (user.displayName ?? userProfile?.displayName ?? user.email ?? "")
    : "";
  const nameDelay = 500 + greeting.length * 55 + 80;
  const typedName = useTyping(displayName, 55, nameDelay);
  const buttonsDelay = nameDelay + displayName.length * 55 + 150;

  if (!loading && user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 overflow-hidden"
        >
          <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 -left-40 size-96 rounded-full bg-primary/8 blur-3xl" />
        </div>
        <div className="relative flex flex-col flex-1">
          <header className="flex items-center justify-between px-6 md:px-12 py-6">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary text-primary-foreground text-sm font-black flex items-center justify-center select-none">
                KP
              </div>
              <span className="font-bold text-foreground tracking-tight">
                KiraPoket
              </span>
            </div>
            <ThemeToggle />
          </header>

          <main className="flex-1 flex items-center justify-center px-6 py-16">
            <div className="flex flex-col items-center gap-8 text-center max-w-sm w-full">
              <Avatar size="lg" className="size-20 anim-scale-in">
                {user.photoURL && (
                  <AvatarImage
                    src={user.photoURL}
                    alt={user.displayName ?? "User"}
                  />
                )}
                <AvatarFallback className="text-2xl">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>

              <div
                className="space-y-1 anim-fade-up"
                style={{ animationDelay: "200ms" }}
              >
                <p className="text-muted-foreground text-sm">{typedGreeting}</p>
                <h1 className="text-2xl font-bold text-foreground">
                  {typedName}
                </h1>
              </div>

              <div
                className="flex flex-col gap-3 w-full anim-fade-up"
                style={{ animationDelay: `${buttonsDelay}ms` }}
              >
                <Link
                  href="/home"
                  className="inline-flex items-center justify-center gap-2 h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-6 w-full"
                >
                  <LayoutDashboardIcon className="size-5" />
                  Go to Home
                </Link>
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-12 rounded-xl gap-2 text-muted-foreground"
                  onClick={handleSignOut}
                >
                  <LogOutIcon />
                  Sign out
                </Button>
              </div>
            </div>
          </main>

          <footer className="text-center py-6 text-xs text-muted-foreground space-x-2">
            <span>KiraPoket &copy; {new Date().getFullYear()}</span>
            <span>·</span>
            <Link
              href="/changelog"
              className="hover:text-muted-foreground transition-colors"
            >
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </Link>
            <span>·</span>
            <Link
              href="/privacy"
              className="hover:text-muted-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Gradient blobs ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 -left-40 size-96 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <PullToRefresh
        onRefresh={async () => {
          await new Promise((r) => setTimeout(r, 300));
          window.location.reload();
        }}
        className="relative flex flex-col flex-1"
      >
        {/* ── Nav bar ── */}
        <header className="flex items-center justify-between px-6 md:px-12 py-6">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground text-sm font-black flex items-center justify-center select-none">
              KP
            </div>
            <span className="font-bold text-foreground tracking-tight">
              KiraPoket
            </span>
          </div>
          <ThemeToggle />
        </header>

        {/* ── Two-column hero (stacked on mobile, side-by-side on md+) ── */}
        <main className="flex-1 flex items-center px-6 md:px-12 py-12 md:py-0">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left — copy + CTA */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <div
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-card w-fit text-xs text-muted-foreground anim-fade-up"
                  style={{ animationDelay: "0ms" }}
                >
                  <span className="size-1.5 rounded-full bg-success animate-pulse" />
                  Free · Malaysian-made · v{process.env.NEXT_PUBLIC_APP_VERSION}
                </div>
                <h1
                  className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight anim-fade-up"
                  style={{ animationDelay: "100ms" }}
                >
                  Know where your
                  <br className="hidden md:block" /> money goes.
                </h1>
                <p
                  className="text-base text-muted-foreground leading-relaxed max-w-sm anim-fade-up"
                  style={{ animationDelay: "220ms" }}
                >
                  Track spending by your salary cycle, not the calendar.
                  Organise every cent into Needs, Wants, and Savings — with
                  budgets, an AI assistant, and a shared partner view.
                </p>
              </div>

              {/* CTA */}
              {inAppBrowser ? (
                <div
                  className="anim-fade-up"
                  style={{ animationDelay: "340ms" }}
                >
                  <InAppBrowserBanner />
                </div>
              ) : (
                <div
                  className="flex flex-col gap-2 anim-fade-up md:w-fit"
                  style={{ animationDelay: "340ms" }}
                >
                  <Button
                    onClick={handleSignIn}
                    size="lg"
                    className="gap-3 h-12 rounded-xl text-base font-semibold shadow-e2 w-full md:w-fit md:px-8"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </Button>
                  <p className="text-xs text-muted-foreground leading-relaxed text-center">
                    By signing in you agree to our{" "}
                    <Link
                      href="/privacy"
                      className="link-underline hover:text-foreground transition-colors"
                    >
                      privacy policy
                    </Link>
                    .
                  </p>
                </div>
              )}

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className="anim-fade-up"
                  style={{ animationDelay: "460ms" }}
                >
                  <FeatureCard
                    icon={RefreshCw}
                    title="Salary cycle tracking"
                    desc="All summaries scoped to your pay cycle, not the calendar month."
                  />
                </div>
                <div
                  className="anim-fade-up"
                  style={{ animationDelay: "520ms" }}
                >
                  <FeatureCard
                    icon={Target}
                    title="Budgets"
                    desc="Set spending targets per category and track progress in real time."
                  />
                </div>
                <div
                  className="anim-fade-up"
                  style={{ animationDelay: "580ms" }}
                >
                  <FeatureCard
                    icon={Sparkles}
                    title="AI Assistant"
                    desc="Chat about your spending and budgets, grounded in your real data — coming soon."
                  />
                </div>
                <div
                  className="anim-fade-up"
                  style={{ animationDelay: "640ms" }}
                >
                  <FeatureCard
                    icon={HandCoins}
                    title="Debt Tracker"
                    desc="Track what you owe and what's owed to you — with Pay and Collect flows."
                  />
                </div>
                <div
                  className="anim-fade-up"
                  style={{ animationDelay: "700ms" }}
                >
                  <FeatureCard
                    icon={Wallet}
                    title="Multiple accounts"
                    desc="Bank, cash, e-wallet, credit, savings — all in one place with colour coding."
                  />
                </div>
                <div
                  className="anim-fade-up"
                  style={{ animationDelay: "760ms" }}
                >
                  <FeatureCard
                    icon={Users}
                    title="Partner view"
                    desc="Invite your partner to see your finances in read-only mode. Pause anytime."
                  />
                </div>
              </div>
              <div className="anim-fade-up" style={{ animationDelay: "820ms" }}>
                <InstallBanner />
              </div>
            </div>

            {/* Right — mock dashboard */}
            <div
              className="anim-slide-right w-full md:ml-auto md:w-[417px]"
              style={{ animationDelay: "200ms" }}
            >
              <MockDashboard />
            </div>
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="text-center py-6 text-xs text-muted-foreground space-x-2">
          <span>KiraPoket &copy; {new Date().getFullYear()}</span>
          <span>·</span>
          <Link
            href="/changelog"
            className="hover:text-muted-foreground transition-colors"
          >
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </Link>
          <span>·</span>
          <Link
            href="/privacy"
            className="hover:text-muted-foreground transition-colors"
          >
            Privacy Policy
          </Link>
        </footer>
      </PullToRefresh>
    </div>
  );
}
