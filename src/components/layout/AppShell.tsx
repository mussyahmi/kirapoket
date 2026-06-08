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
  MessageSquareIcon,
  ScrollTextIcon,
  ShieldAlertIcon,
  CoffeeIcon,
  PlusIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useApp, ADMIN_UID } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import FeedbackButton from "@/components/common/FeedbackButton";
import SupportButton from "@/components/common/SupportButton";
import pkg from "../../../package.json";

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
  { href: "/changelog", label: "Changelog", icon: ScrollTextIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

// Desktop sidebar — all pages
const allNavItems = [...bottomNavItems, ...menuItems];

// Light haptic tap on supported devices (Android/Chrome; a no-op on iOS Safari)
function haptic(ms = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}

export function AppShell({ children, banner }: { children: React.ReactNode; banner?: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile, accounts, debts, transactions, isViewingPartner, isImpersonating } = useApp();
  const isReadOnly = isViewingPartner || isImpersonating;
  const { user } = useAuth();
  const isAdmin = user?.uid === ADMIN_UID;
  const unsettledCount = debts.filter((d) => !d.settled).length;
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Liquid Glass sliding lens over the active bottom-nav tab
  const navRef = useRef<HTMLElement>(null);
  const pillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [lens, setLens] = useState({ x: 0, top: 0, w: 0, h: 0, show: false });
  const [lensReady, setLensReady] = useState(false);
  // Transient "liquid" squash applied while the lens is in transit
  const [stretch, setStretch] = useState({ active: false, toRight: true });
  const prevIdxRef = useRef<number | null>(null);
  const stretchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Setup-gated tabs unlock once setup is done — but never re-lock once transactions exist
  const setupComplete = userProfile?.salaryDay != null && accounts.length > 0;
  const setupGated = !setupComplete && transactions.length === 0;

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

  // Position the sliding lens over the active tab; it animates between tabs via CSS
  useEffect(() => {
    const nav = navRef.current;
    const measure = () => {
      const idx = bottomNavItems.findIndex(
        (it) => pathname === it.href || pathname.startsWith(it.href + "/")
      );
      const pill = pillRefs.current[idx];
      if (!nav || !pill) {
        setLens((l) => ({ ...l, show: false }));
        return;
      }
      const nr = nav.getBoundingClientRect();
      const pr = pill.getBoundingClientRect();
      const x = pr.left - nr.left;
      // Squash toward the direction of travel, but only on a real tab change
      // (not on first paint, resize, or the scroll shrink/grow reflow)
      const prevIdx = prevIdxRef.current;
      if (prevIdx != null && prevIdx >= 0 && prevIdx !== idx) {
        setStretch({ active: true, toRight: idx > prevIdx });
        if (stretchTimer.current) clearTimeout(stretchTimer.current);
        stretchTimer.current = setTimeout(() => setStretch((s) => ({ ...s, active: false })), 230);
      }
      prevIdxRef.current = idx;
      setLens({ x, top: pr.top - nr.top, w: pr.width, h: pr.height, show: true });
      setLensReady(true);
    };
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    if (nav) ro.observe(nav);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (stretchTimer.current) clearTimeout(stretchTimer.current);
    };
  }, [pathname, setupGated, unsettledCount]);

  // Central quick-add button shows once the user can actually add (set up, not read-only)
  const showAdd = setupComplete && !isReadOnly;

  // Icon-only bottom-nav item (labels removed); i must stay the bottomNavItems index
  const renderNavItem = (
    { href, label, icon: Icon, requiresSetup }: (typeof bottomNavItems)[number],
    i: number
  ) => {
    const disabled = requiresSetup && setupGated;
    const active = isActive(href);
    const pillCls = cn(
      "relative z-10 flex items-center justify-center rounded-full transition-all duration-300",
      navVisible ? "w-12 h-9" : "w-9 h-7"
    );
    const iconSize = navVisible ? "size-6" : "size-5";
    return disabled ? (
      <span
        key={href}
        title={label}
        className="flex items-center justify-center flex-1 cursor-not-allowed select-none"
      >
        <span ref={(el) => { pillRefs.current[i] = el; }} className={pillCls}>
          <Icon className={cn("text-muted-foreground/30 transition-all duration-300", iconSize)} />
        </span>
      </span>
    ) : (
      <Link
        key={href}
        href={href}
        aria-label={label}
        onClick={() => { if (!active) haptic(); }}
        className="flex items-center justify-center flex-1"
      >
        <span ref={(el) => { pillRefs.current[i] = el; }} className={pillCls}>
          <Icon className={cn("transition-all duration-300", iconSize, active ? "text-primary" : "text-muted-foreground")} />
          {href === "/debts" && unsettledCount > 0 && (
            <span className="absolute top-0.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-background" />
          )}
        </span>
      </Link>
    );
  };

  return (
    <div className="flex h-full min-h-screen">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:border-r md:border-border md:bg-card md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary text-primary-foreground text-xs font-black flex items-center justify-center select-none">KP</span>
            <span className="text-base font-bold tracking-tight text-foreground">KiraPoket</span>
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {allNavItems.map(({ href, label, icon: Icon, ...rest }) => {
            const disabled = ("requiresSetup" in rest ? rest.requiresSetup : false) && setupGated;
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
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive("/admin")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ShieldAlertIcon className="size-4 shrink-0 text-orange-500" />
              <span className="flex-1">Admin</span>
            </Link>
          )}
          <div className="pt-2 mt-1 border-t border-border space-y-0.5">
            <FeedbackButton className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" />
            <SupportButton className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" />
          </div>
        </nav>
        <div className="px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground/50">v{pkg.version}</span>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header — solid, edge-pinned, always visible */}
        <header className={cn(
          "md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-[60]",
          // Matches the page background, with a hairline to separate from content
          "bg-background border-b border-border"
        )}>
          <Link href="/" className="flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary text-primary-foreground text-xs font-black flex items-center justify-center select-none">KP</span>
            <span className="text-base font-bold tracking-tight text-foreground">KiraPoket</span>
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
                <div className={cn(
                  "absolute right-0 top-full mt-1.5 w-44 rounded-xl overflow-hidden z-[60]",
                  // High opacity — menu sits over live content with no overlay, so readability wins
                  "bg-popover/95",
                  "border border-black/[0.08] dark:border-white/[0.14]",
                  "backdrop-blur-2xl backdrop-saturate-200",
                  "shadow-[0_16px_40px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_50px_-14px_rgba(0,0,0,0.55)]"
                )}>
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
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                        isActive("/admin")
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <ShieldAlertIcon className="size-4 shrink-0 text-orange-500" />
                      Admin
                    </Link>
                  )}
                  <div className="border-t border-border py-1">
                    <button
                      onClick={() => { setMenuOpen(false); setFeedbackOpen(true); }}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium w-full text-foreground hover:bg-muted transition-colors"
                    >
                      <MessageSquareIcon className="size-4 shrink-0" />
                      Give Feedback
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setSupportOpen(true); }}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium w-full text-foreground hover:bg-muted transition-colors"
                    >
                      <CoffeeIcon className="size-4 shrink-0" />
                      Buy Me a Coffee
                    </button>
                    <div className="px-4 py-2">
                      <span className="text-xs text-muted-foreground/50">v{pkg.version}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dialogs rendered outside menu conditional so they survive menu close */}
        <FeedbackButton dialogOnly open={feedbackOpen} onOpenChange={setFeedbackOpen} />
        <SupportButton dialogOnly open={supportOpen} onOpenChange={setSupportOpen} />

        {/* Page Content */}
        {banner}
        <main className="flex-1 overflow-auto pb-28 md:pb-0">{children}</main>
      </div>

      {/* ── Mobile Bottom Nav — Liquid Glass; shrinks & drops labels on scroll ── */}
      <nav
        ref={navRef}
        style={{
          // Lift the bottom by half the height drop so the bar shrinks toward its centre
          bottom: navVisible
            ? "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.5rem))"
            : "calc(max(1.25rem, calc(env(safe-area-inset-bottom) + 0.5rem)) + 0.375rem)",
          // At rest: full-width bar. On scroll: narrower, shorter (icons close up)
          width: navVisible ? "calc(100vw - 1.5rem)" : "17rem",
          height: navVisible ? "4rem" : "3.25rem",
          transition:
            "width 350ms cubic-bezier(0.34,1.4,0.5,1), height 350ms cubic-bezier(0.34,1.4,0.5,1), bottom 350ms cubic-bezier(0.34,1.4,0.5,1)",
        }}
        className={cn(
          "md:hidden fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-around px-1.5",
          "rounded-3xl",
          // Minimal fill — the bar tints toward whatever content scrolls behind it
          "bg-white/20 dark:bg-white/[0.04]",
          // Faint hairline border — kept subtle so it doesn't read as a hard outline
          "border border-black/[0.06] dark:border-white/[0.06]",
          // Light lens-blur + strong saturation so content colour bleeds through vividly
          "backdrop-blur-sm backdrop-saturate-[2.2]",
          // Outer drop shadow + a soft lit top edge and gentle corner glints (no full ring)
          "shadow-[0_10px_30px_-10px_rgba(0,0,0,0.18),0_2px_6px_-2px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.5),inset_-8px_-6px_5px_-9px_rgba(255,255,255,0.5),inset_8px_-6px_5px_-9px_rgba(255,255,255,0.5)]",
          "dark:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.12),inset_-8px_-6px_5px_-9px_rgba(255,255,255,0.22),inset_8px_-6px_5px_-9px_rgba(255,255,255,0.22)]"
        )}
      >
        {/* Top-down gloss — specular sheen across the glass surface */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/30 via-transparent to-white/[0.06] dark:from-white/[0.12] dark:to-white/[0.02]"
        />
        {/* Sliding Liquid Glass lens — animates between tabs */}
        {lens.show && (
          <span
            aria-hidden
            style={{
              left: lens.x,
              top: lens.top,
              width: lens.w,
              height: lens.h,
              transformOrigin: stretch.toRight ? "left center" : "right center",
              transform: `scaleX(${stretch.active ? 1.28 : 1})`,
              transition: lensReady
                ? "left 450ms cubic-bezier(0.34,1.4,0.5,1), top 450ms cubic-bezier(0.34,1.4,0.5,1), width 450ms cubic-bezier(0.34,1.4,0.5,1), height 450ms cubic-bezier(0.34,1.4,0.5,1), transform 300ms cubic-bezier(0.5,0,0.2,1)"
                : undefined,
            }}
            className={cn(
              "pointer-events-none absolute z-0 rounded-full",
              "bg-primary/20 dark:bg-primary/25",
              // Raised glass droplet: soft lit top edge + gentle corner glints (no full ring)
              "shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_-4px_-4px_3px_-5px_rgba(255,255,255,0.5),inset_4px_-3px_3px_-5px_rgba(255,255,255,0.28)]",
              "dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),inset_-4px_-4px_3px_-5px_rgba(255,255,255,0.3),inset_4px_-3px_3px_-5px_rgba(255,255,255,0.16)]"
            )}
          />
        )}
        {bottomNavItems.slice(0, 2).map((item, i) => renderNavItem(item, i))}
        {showAdd && (
          <Link
            href="/transactions/new"
            aria-label="Add transaction"
            onClick={() => haptic(12)}
            className="flex items-center justify-center flex-1"
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-300 active:scale-95",
                "shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3)]",
                navVisible ? "size-12" : "size-10"
              )}
            >
              <PlusIcon className={cn("transition-all duration-300", navVisible ? "size-6" : "size-5")} strokeWidth={2.5} />
            </span>
          </Link>
        )}
        {bottomNavItems.slice(2).map((item, i) => renderNavItem(item, i + 2))}
      </nav>
    </div>
  );
}
