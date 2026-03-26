"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  HomeIcon,
  ArrowLeftRightIcon,
  WalletIcon,
  TagIcon,
  BarChart3Icon,
  SettingsIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home", icon: HomeIcon, requiresSetup: false },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRightIcon, requiresSetup: true },
  { href: "/budget", label: "Budget", icon: BarChart3Icon, requiresSetup: false },
  { href: "/accounts", label: "Accounts", icon: WalletIcon, requiresSetup: false },
  { href: "/categories", label: "Categories", icon: TagIcon, requiresSetup: false },
  { href: "/settings", label: "Settings", icon: SettingsIcon, requiresSetup: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile, accounts } = useApp();

  const setupComplete = userProfile?.salaryDay != null && accounts.length > 0;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (Math.abs(delta) < 4) return;
      setNavVisible(delta < 0 || currentY < 50);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex h-full min-h-screen">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:border-r md:border-border md:bg-card md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <Link href="/" className="text-base font-semibold tracking-tight text-foreground">
            KiraPoket
          </Link>
          <ThemeToggle />
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, requiresSetup }) => {
            const disabled = requiresSetup && !setupComplete;
            return disabled ? (
              <span
                key={href}
                title="Complete setup first"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/40 cursor-not-allowed select-none"
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </span>
            ) : (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <header className={cn(
          "md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-40 transition-transform duration-300",
          navVisible ? "translate-y-0" : "-translate-y-full"
        )}>
          <Link href="/" className="text-base font-semibold tracking-tight text-foreground">
            KiraPoket
          </Link>
          <ThemeToggle />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className={cn(
        "md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t border-border bg-card h-16 px-1 transition-transform duration-300",
        navVisible ? "translate-y-0" : "translate-y-full"
      )}>
        {navItems.map(({ href, label, icon: Icon, requiresSetup }) => {
          const disabled = requiresSetup && !setupComplete;
          const active = isActive(href);
          return disabled ? (
            <span
              key={href}
              title={label}
              className="flex items-center justify-center flex-1 cursor-not-allowed select-none"
            >
              <Icon className="size-5 text-muted-foreground/30" />
            </span>
          ) : (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex items-center justify-center flex-1 py-2"
            >
              <span className={cn(
                "flex items-center justify-center w-10 h-8 rounded-full transition-colors",
                active ? "bg-primary/15" : ""
              )}>
                <Icon className={cn("size-5 transition-colors", active ? "text-primary" : "text-muted-foreground")} />
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
