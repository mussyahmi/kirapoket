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
  HandCoinsIcon,
  MenuIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

// Bottom nav — 4 core daily-use pages
const bottomNavItems = [
  { href: "/home", label: "Home", icon: HomeIcon, requiresSetup: false },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRightIcon, requiresSetup: true },
  { href: "/budget", label: "Budget", icon: BarChart3Icon, requiresSetup: false },
  { href: "/debts", label: "Debts", icon: HandCoinsIcon, requiresSetup: false },
];

// Header menu — less-visited pages
const menuItems = [
  { href: "/accounts", label: "Accounts", icon: WalletIcon },
  { href: "/categories", label: "Categories", icon: TagIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

// Desktop sidebar — all pages
const allNavItems = [...bottomNavItems, ...menuItems];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile, accounts, debts } = useApp();
  const unsettledCount = debts.filter((d) => !d.settled).length;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <div className="flex h-full min-h-screen">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:border-r md:border-border md:bg-card md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <Link href="/" className="text-base font-semibold tracking-tight text-foreground">
            KiraPoket
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {allNavItems.map(({ href, label, icon: Icon, ...rest }) => {
            const disabled = ("requiresSetup" in rest ? rest.requiresSetup : false) && !setupComplete;
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
                <span className="flex-1">{label}</span>
                {href === "/debts" && unsettledCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {unsettledCount > 99 ? "99+" : unsettledCount}
                  </span>
                )}
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
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {/* Header menu button */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className={cn(
                  "size-9 flex items-center justify-center rounded-lg transition-colors",
                  menuOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                )}
                aria-label="More options"
              >
                <MenuIcon className="size-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50">
                  {menuItems.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                        isActive(href)
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      </div>

      {/* ── Mobile Bottom Nav — 4 items only ── */}
      <nav className={cn(
        "md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t border-border bg-card h-16 px-1 transition-transform duration-300",
        navVisible ? "translate-y-0" : "translate-y-full"
      )}>
        {bottomNavItems.map(({ href, label, icon: Icon, requiresSetup }) => {
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
              className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5"
            >
              <span className={cn(
                "flex items-center justify-center w-10 h-8 rounded-full transition-colors",
                active ? "bg-primary/15" : ""
              )}>
                <Icon className={cn("size-5 transition-colors", active ? "text-primary" : "text-muted-foreground")} />
              </span>
              {href === "/debts" && unsettledCount > 0 ? (
                <span className="size-1.5 rounded-full bg-red-500" />
              ) : (
                <span className="size-1.5" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
