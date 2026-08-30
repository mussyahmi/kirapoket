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
  SparklesIcon,
  LockIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useApp, ADMIN_UID } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAddTransaction } from "@/components/transactions/AddTransactionSheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import FeedbackButton from "@/components/common/FeedbackButton";
import SupportButton from "@/components/common/SupportButton";
import PullToRefresh from "@/components/common/PullToRefresh";
import pkg from "../../../package.json";

// Bottom nav — 4 core daily-use pages
const bottomNavItems = [
  { href: "/home", label: "Home", icon: HomeIcon, requiresSetup: false },
  {
    href: "/transactions",
    label: "Transactions",
    icon: ArrowLeftRightIcon,
    requiresSetup: true,
  },
  {
    href: "/budget",
    label: "Budget",
    icon: BarChart3Icon,
    requiresSetup: false,
  },
  { href: "/debts", label: "Debts", icon: HandCoinsIcon, requiresSetup: false },
];

// Header menu — less-visited pages
const menuItems = [
  { href: "/assistant", label: "AI Assistant", icon: SparklesIcon },
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

export function AppShell({
  children,
  banner,
}: {
  children: React.ReactNode;
  banner?: React.ReactNode;
}) {
  const pathname = usePathname();
  const {
    userProfile,
    accounts,
    debts,
    transactions,
    loadingProfile,
    loadingAccounts,
    isViewingPartner,
    isImpersonating,
    refreshAll,
  } = useApp();
  const isReadOnly = isViewingPartner || isImpersonating;
  const { user } = useAuth();
  const { open: addOpen, openAdd } = useAddTransaction();
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
  // Transient"liquid" squash applied while the lens is in transit
  const [stretch, setStretch] = useState({ active: false, toRight: true });
  // Whether the lens should animate itself. Only a real tab change earns the
  // springy slide; a scroll reflow must not, or the lens visibly wobbles as it
  // chases the bar's own 350ms resize.
  const [lensAnimating, setLensAnimating] = useState(false);
  // The lens slide and squash are decorative, so they are dropped entirely when
  // the user asks for reduced motion — not just the deferred navigation.
  const [reducedMotion, setReducedMotion] = useState(false);
  const prevIdxRef = useRef<number | null>(null);
  const stretchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Setup-gated tabs unlock once setup is done — but never re-lock once transactions exist
  // Logging only needs an account now — salary day is optional (defaults to a
  // calendar-ish cycle) so users aren't walled off before seeing any value.
  const setupComplete = accounts.length > 0;
  const setupGated = !setupComplete && transactions.length === 0;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      // iOS rubber-band overscroll reports positions outside the document —
      // negative at the top, past the end at the bottom — and bouncing back
      // flips the delta sign repeatedly. Unclamped, that toggles the bar over
      // and over at both ends of a long list.
      const maxY = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const currentY = Math.min(Math.max(window.scrollY, 0), maxY);
      const delta = currentY - lastScrollY.current;
      if (Math.abs(delta) < 4) return;
      setNavVisible(delta < 0 || currentY < 50);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
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
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Position the sliding lens over the active tab; it animates between tabs via CSS
  useEffect(() => {
    const nav = navRef.current;
    const measure = () => {
      const activeIdx = bottomNavItems.findIndex(
        (it) => pathname === it.href || pathname.startsWith(it.href + "/"),
      );
      const idx = activeIdx;
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
      const tabChanged = prevIdx != null && prevIdx >= 0 && prevIdx !== idx;
      // The bar resizes continuously while scrolling, so this remeasures every
      // frame — with no transition the lens stays glued to its pill instead of
      // easing toward a target that has already moved again.
      setLensAnimating(tabChanged && !reducedMotion);
      if (tabChanged && !reducedMotion) {
        setStretch({ active: true, toRight: idx > prevIdx });
        if (stretchTimer.current) clearTimeout(stretchTimer.current);
        stretchTimer.current = setTimeout(
          () => setStretch((s) => ({ ...s, active: false })),
          230,
        );
      }
      prevIdxRef.current = idx;
      setLens({
        x,
        top: pr.top - nr.top,
        w: pr.width,
        h: pr.height,
        show: true,
      });
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
  }, [pathname, setupGated, unsettledCount, reducedMotion]);

  // Central quick-add button: shown unless read-only, and optimistically during
  // load so it doesn't flash out on refresh before profile/accounts arrive
  const showAdd =
    !isReadOnly && (setupComplete || loadingProfile || loadingAccounts);

  // Icon-only bottom-nav item (labels removed); i must stay the bottomNavItems index
  const renderNavItem = (
    { href, label, icon: Icon, requiresSetup }: (typeof bottomNavItems)[number],
    i: number,
  ) => {
    const disabled = requiresSetup && setupGated;
    const active = isActive(href);
    const pillCls = cn(
      // active:scale-95 matches the centre Add button. It is the only tap
      // acknowledgement on iOS, where navigator.vibrate does not exist, so the
      // haptic above is silently a no-op.
      "relative z-10 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95",
      navVisible ? "w-12 h-9" : "w-9 h-7",
    );
    const iconSize = navVisible ? "size-6" : "size-5";
    // #17 — a gated tab used to be a near-invisible icon that silently did
    // nothing when tapped (`title` never fires on touch). It now reads as
    // locked and says why.
    return disabled ? (
      <button
        key={href}
        type="button"
        aria-label={`${label} — add an account first`}
        onClick={() =>
          toast.info("Add an account first to start logging transactions.", {
            id: "nav-locked",
          })
        }
        className="flex flex-1 items-center justify-center select-none"
      >
        <span
          ref={(el) => {
            pillRefs.current[i] = el;
          }}
          className={cn(pillCls, "relative opacity-40")}
        >
          <Icon
            className={cn(
              "text-muted-foreground transition-all duration-300",
              iconSize,
            )}
          />
          <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-muted">
            <LockIcon className="size-2.5 text-muted-foreground" />
          </span>
        </span>
      </button>
    ) : (
      <Link
        key={href}
        href={href}
        // The tab is icon-only and the lens is aria-hidden, so without this the
        // active tab is conveyed by nothing but colour and stroke weight.
        aria-current={active ? "page" : undefined}
        aria-label={
          href === "/debts" && unsettledCount > 0
            ? `${label}, ${unsettledCount} unsettled`
            : label
        }
        onClick={() => {
          if (active) return;
          // Navigate straight away — the lens slides to the new tab off
          // `pathname` while the page changes, so there is nothing to wait for.
          haptic();
        }}
        className="flex items-center justify-center flex-1"
      >
        <span
          ref={(el) => {
            pillRefs.current[i] = el;
          }}
          className={pillCls}
        >
          {/* Active is carried by weight as well as colour — the lens tint is
              only primary/20 over glass, so hue alone would leave the two
              states near-identical in sunlight or for a colourblind user. */}
          <Icon
            strokeWidth={active ? 2.5 : 2}
            className={cn(
              "transition-all duration-300",
              iconSize,
              active ? "text-primary" : "text-muted-foreground",
            )}
          />
          {href === "/debts" && unsettledCount > 0 && (
            // Anchored to the icon box rather than the pill, which shrinks on
            // scroll and used to drag the dot away from its icon. The old
            // ring-white halo assumed an opaque surface — this bar is glass, so
            // a darker rim of the dot's own hue separates it from the icon
            // without painting a colour the background does not have.
            <span
              aria-hidden
              className={cn(
                "absolute rounded-full bg-danger ring-1 ring-danger/40 transition-all duration-300",
                navVisible
                  ? "size-2.5 top-1 right-1.5"
                  : "size-2 top-0.5 right-0.5",
              )}
            />
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
            <span className="size-7 rounded-lg bg-primary text-primary-foreground text-xs font-black flex items-center justify-center select-none">
              KP
            </span>
            <span className="text-base font-bold tracking-tight text-foreground">
              KiraPoket
            </span>
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {allNavItems.map(({ href, label, icon: Icon, ...rest }) => {
            const disabled =
              ("requiresSetup" in rest ? rest.requiresSetup : false) &&
              setupGated;
            return disabled ? (
              <span
                key={href}
                title="Complete setup first"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed select-none opacity-50"
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
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {href === "/debts" && unsettledCount > 0 && (
                  <span className="ml-auto min-w-5 h-5 rounded-full bg-danger text-white text-xs font-semibold flex items-center justify-center px-1">
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
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <ShieldAlertIcon className="size-4 shrink-0 text-warning-strong" />
              <span className="flex-1">Admin</span>
            </Link>
          )}
          <div className="pt-2 mt-1 border-t border-border space-y-0.5">
            <FeedbackButton className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" />
            <SupportButton className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" />
          </div>
        </nav>
        <div className="px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">v{pkg.version}</span>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header — solid, edge-pinned, always visible */}
        <header
          className={cn(
            "md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-[60]",
            // Matches the page background, with a hairline to separate from content
            "bg-background border-b border-border",
          )}
        >
          <Link href="/" className="flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary text-primary-foreground text-xs font-black flex items-center justify-center select-none">
              KP
            </span>
            <span className="text-base font-bold tracking-tight text-foreground">
              KiraPoket
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {/* Header menu button */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className={cn(
                  "size-9 pointer-coarse:size-11 flex items-center justify-center rounded-lg transition-colors",
                  menuOpen
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                aria-label="More options"
              >
                <MenuIcon className="size-4" />
              </button>
              {menuOpen && (
                <div
                  className={cn(
                    "absolute right-0 top-full mt-2 w-44 rounded-xl overflow-hidden z-[60]",
                    // High opacity — menu sits over live content with no overlay, so readability wins
                    "bg-popover/90",
                    "border border-black/[0.06] dark:border-white/[0.08]",
                    "backdrop-blur-xl backdrop-saturate-[2.2]",
                    "shadow-[var(--shadow-e3),var(--shadow-lit)]",
                  )}
                >
                  {menuItems.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                        isActive(href)
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted",
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
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <ShieldAlertIcon className="size-4 shrink-0 text-warning-strong" />
                      Admin
                    </Link>
                  )}
                  <div className="border-t border-border py-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setFeedbackOpen(true);
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium w-full text-foreground hover:bg-muted transition-colors"
                    >
                      <MessageSquareIcon className="size-4 shrink-0" />
                      Give Feedback
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setSupportOpen(true);
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium w-full text-foreground hover:bg-muted transition-colors"
                    >
                      <CoffeeIcon className="size-4 shrink-0" />
                      Buy Me a Coffee
                    </button>
                    <div className="px-4 py-2">
                      <span className="text-xs text-muted-foreground">
                        v{pkg.version}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dialogs rendered outside menu conditional so they survive menu close */}
        <FeedbackButton
          dialogOnly
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
        />
        <SupportButton
          dialogOnly
          open={supportOpen}
          onOpenChange={setSupportOpen}
        />

        {/* Page Content */}
        {banner}
        <main className="flex-1 overflow-auto pb-32 md:pb-0">
          <PullToRefresh onRefresh={refreshAll}>{children}</PullToRefresh>
        </main>
      </div>

      {/* ── Mobile Bottom Nav — Liquid Glass; shrinks & drops labels on scroll ── */}
      <nav
        ref={navRef}
        aria-label="Main"
        style={{
          // Lift the bottom by half the height drop so the bar shrinks toward its centre
          bottom: navVisible
            ? "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.5rem))"
            : "calc(max(1.25rem, calc(env(safe-area-inset-bottom) + 0.5rem)) + 0.375rem)",
          // At rest: full-width bar. On scroll: narrower, shorter (icons close up)
          width: navVisible ? "calc(100vw - 5rem)" : "17rem",
          height: navVisible ? "4rem" : "3.25rem",
          transition:
            "width 350ms cubic-bezier(0.34,1.4,0.5,1), height 350ms cubic-bezier(0.34,1.4,0.5,1), bottom 350ms cubic-bezier(0.34,1.4,0.5,1), transform 300ms cubic-bezier(0.34,1.4,0.5,1), opacity 250ms ease",
        }}
        className={cn(
          "md:hidden fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-around px-2",
          "rounded-3xl",
          // Slide out of the way while the add-transaction sheet is open
          addOpen && "translate-y-[140%] opacity-0 pointer-events-none",
          // Minimal fill — the bar tints toward whatever content scrolls behind it
          "bg-white/20 dark:bg-white/[0.04]",
          // Faint hairline border — kept subtle so it doesn't read as a hard outline
          "border border-black/[0.06] dark:border-white/[0.06]",
          // Light lens-blur + strong saturation so content colour bleeds through vividly
          "backdrop-blur-sm backdrop-saturate-[2.2]",
          // e4 drop + lit top edge, plus two corner glints unique to this surface
          "shadow-[var(--shadow-e4),var(--shadow-lit),inset_-8px_-6px_5px_-9px_rgb(255_255_255/0.5),inset_8px_-6px_5px_-9px_rgb(255_255_255/0.5)]",
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
              transition:
                lensReady && lensAnimating
                  ? "left 450ms cubic-bezier(0.34,1.4,0.5,1), top 450ms cubic-bezier(0.34,1.4,0.5,1), width 450ms cubic-bezier(0.34,1.4,0.5,1), height 450ms cubic-bezier(0.34,1.4,0.5,1), transform 300ms cubic-bezier(0.5,0,0.2,1)"
                  : undefined,
            }}
            className={cn(
              "pointer-events-none absolute z-0 rounded-full",
              "bg-primary/20 dark:bg-primary/25",
              // A defined edge so the lens reads as a shape, not just a tint
              "ring-1 ring-primary/30 dark:ring-primary/25",
            )}
          />
        )}
        {bottomNavItems.slice(0, 2).map((item, i) => renderNavItem(item, i))}
        {showAdd && (
          <button
            type="button"
            aria-label="Add transaction"
            onClick={() => {
              haptic(12);
              openAdd();
            }}
            className="flex items-center justify-center flex-1"
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-300 active:scale-95",
                "shadow-e2",
                navVisible ? "size-12" : "size-10",
              )}
            >
              <PlusIcon
                className={cn(
                  "transition-all duration-300",
                  navVisible ? "size-6" : "size-5",
                )}
                strokeWidth={2.5}
              />
            </span>
          </button>
        )}
        {bottomNavItems.slice(2).map((item, i) => renderNavItem(item, i + 2))}
      </nav>
    </div>
  );
}
