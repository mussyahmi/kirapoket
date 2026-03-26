"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Wallet,
  TrendingUp,
  PieChart,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboardIcon,
  LogOutIcon,
} from "lucide-react";

// ─── Google logo SVG ─────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="size-5 shrink-0"
    >
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

// ─── Mock dashboard preview ───────────────────────────────────────────────────
const MOCK_ACCOUNTS = [
  { name: "Maybank", balance: "RM 2,840.00" },
  { name: "Touch 'n Go", balance: "RM 150.00" },
];

const MOCK_L1 = [
  {
    label: "Needs", spent: "RM 630.00", dot: "#4ade80", border: "#4ade8066",
    l2: [
      { name: "Food & Drinks", spent: "RM 420.00", l3: [
        { name: "Groceries", spent: "RM 260.00" },
        { name: "Work Meals", spent: "RM 160.00" },
      ]},
      { name: "Transport", spent: "RM 210.00", l3: [
        { name: "Fuel", spent: "RM 150.00" },
        { name: "Parking & Toll", spent: "RM 60.00" },
      ]},
    ],
  },
  {
    label: "Wants", spent: "RM 225.00", dot: "#fb923c", border: "#fb923c66",
    l2: [
      { name: "Dining Out", spent: "RM 180.00", l3: [] },
      { name: "Subscriptions", spent: "RM 45.00", l3: [
        { name: "Spotify", spent: "RM 17.90" },
      ]},
    ],
  },
  {
    label: "Savings", spent: "RM 300.00", dot: "#60a5fa", border: "#60a5fa66",
    l2: [
      { name: "Goals", spent: "RM 300.00", l3: [] },
    ],
  },
];

function MockDashboard() {
  return (
    <div className="w-full rounded-2xl border border-border bg-card shadow-2xl overflow-hidden text-xs select-none">
      {/* header */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground">Mar 25 – Apr 24</p>
          <p className="font-semibold text-sm text-foreground">Mar Cycle</p>
        </div>
        <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">KP</span>
        </div>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {[
          { label: "Income", value: "RM 4,500", color: "text-emerald-500", Icon: ArrowUpRight },
          { label: "Expenses", value: "RM 2,310", color: "text-red-400", Icon: ArrowDownRight },
          { label: "Savings", value: "RM 2,190", color: "text-primary", Icon: TrendingUp },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="rounded-xl bg-muted/50 p-2.5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">{label}</span>
              <Icon className={`size-3 ${color}`} />
            </div>
            <span className={`font-semibold text-[11px] ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* accounts */}
      <div className="px-3 pb-2 border-b border-border space-y-1">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Accounts</p>
        {MOCK_ACCOUNTS.map(({ name, balance }) => (
          <div key={name} className="flex items-center justify-between">
            <span className="text-[9px] text-foreground">{name}</span>
            <span className="text-[9px] font-medium text-foreground">{balance}</span>
          </div>
        ))}
      </div>

      {/* by category — L1 / L2 / L3 hierarchy */}
      <div className="px-3 pb-3 space-y-3">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Spending by Category</p>
        {MOCK_L1.map(({ label, spent, dot, border, l2 }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                <span className="text-[10px] font-bold text-foreground">{label}</span>
              </div>
              <span className="text-[9px] text-foreground">{spent}</span>
            </div>
            <div className="space-y-1 pl-3 border-l-2" style={{ borderColor: border }}>
              {l2.map(({ name, spent: l2spent, l3 }) => (
                <div key={name} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">{name}</span>
                    <span className="text-[9px] text-muted-foreground">{l2spent}</span>
                  </div>
                  {l3.length > 0 && (
                    <div className="pl-2 border-l border-border/40 space-y-0.5">
                      {l3.map(({ name: l3name, spent: l3spent }) => (
                        <div key={l3name} className="flex items-center justify-between">
                          <span className="text-[8px] text-muted-foreground/60">{l3name}</span>
                          <span className="text-[8px] text-muted-foreground/60">{l3spent}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* recent txns */}
      <div className="border-t border-border px-3 py-2 space-y-1.5">
        {[
          { name: "Grab Food", cat: "Wants", amount: "-RM 18.50", neg: true },
          { name: "Salary", cat: "Income", amount: "+RM 4,500", neg: false },
          { name: "Petronas", cat: "Needs", amount: "-RM 60.00", neg: true },
        ].map(({ name, cat, amount, neg }) => (
          <div key={name} className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-foreground">{name}</p>
              <p className="text-[9px] text-muted-foreground">{cat}</p>
            </div>
            <span className={`text-[10px] font-semibold ${neg ? "text-red-400" : "text-emerald-500"}`}>
              {amount}
            </span>
          </div>
        ))}
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
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { userProfile } = useApp();

  const handleSignIn = async () => {
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
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-background">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 -left-40 size-96 rounded-full bg-primary/8 blur-3xl" />
        </div>
        <div className="relative flex flex-col flex-1">
          <header className="flex items-center justify-between px-6 md:px-12 py-5">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary text-primary-foreground text-sm font-black flex items-center justify-center select-none">
                KP
              </div>
              <span className="font-bold text-foreground tracking-tight">KiraPoket</span>
            </div>
            <ThemeToggle />
          </header>

          <main className="flex-1 flex items-center justify-center px-6 py-16">
            <div className="flex flex-col items-center gap-8 text-center max-w-sm w-full">
              <Avatar size="lg" className="size-20">
                {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName ?? "User"} />}
                <AvatarFallback className="text-2xl">{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">
                  {userProfile?.salaryDay ? "Welcome back," : "Welcome,"}
                </p>
                <h1 className="text-2xl font-bold text-foreground">
                  {user.displayName ?? user.email}
                </h1>
              </div>

              <div className="flex flex-col gap-3 w-full">
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
                  <LogOutIcon className="size-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </main>

          <footer className="text-center py-6 text-[11px] text-muted-foreground/40 space-x-2">
            <span>KiraPoket &copy; {new Date().getFullYear()}</span>
            <span>·</span>
            <span>v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Gradient blobs ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 -left-40 size-96 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative flex flex-col flex-1">
        {/* ── Nav bar ── */}
        <header className="flex items-center justify-between px-6 md:px-12 py-5">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground text-sm font-black flex items-center justify-center select-none">
              KP
            </div>
            <span className="font-bold text-foreground tracking-tight">KiraPoket</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={handleSignIn}
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg hidden md:flex"
            >
              <GoogleIcon />
              Sign in
            </Button>
          </div>
        </header>

        {/* ── Two-column hero (stacked on mobile, side-by-side on md+) ── */}
        <main className="flex-1 flex items-center px-6 md:px-12 py-10 md:py-0">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">

            {/* Left — copy + CTA */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card w-fit text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Personal expense tracker
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
                  Know where your<br className="hidden md:block" /> money goes.
                </h1>
                <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
                  Track spending by your salary cycle, not the calendar. Organise every cent into Needs, Wants, and Savings — with budgets.
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSignIn}
                  size="lg"
                  className="gap-3 h-12 rounded-xl text-base font-semibold shadow-md w-full md:w-fit md:px-8"
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  By signing in you agree to our terms of service and privacy policy.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2.5">
                <FeatureCard
                  icon={RefreshCw}
                  title="Salary cycle tracking"
                  desc="All summaries scoped to your pay cycle, not the calendar month."
                />
                <FeatureCard
                  icon={PieChart}
                  title="Needs · Wants · Savings"
                  desc="Organise every cent into three buckets with optional budgets per category."
                />
                <FeatureCard
                  icon={Wallet}
                  title="Multiple accounts"
                  desc="Maybank, Cash, Touch 'n Go, credit cards — all in one place."
                />
              </div>
            </div>

            {/* Right — mock dashboard */}
            <div className="w-full md:max-w-sm md:ml-auto">
              <MockDashboard />
            </div>

          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="text-center py-6 text-[11px] text-muted-foreground/40 space-x-2">
          <span>KiraPoket &copy; {new Date().getFullYear()}</span>
          <span>·</span>
          <span>v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
        </footer>
      </div>
    </div>
  );
}
