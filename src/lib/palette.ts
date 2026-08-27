/**
 * Single source of truth for the identity colours used in inline styles.
 *
 * The values live in `globals.css` as OKLCH custom properties so they respond
 * to light/dark and share the warm hue bias of the rest of the theme. Anything
 * that needs a colour from JS should import from here rather than re-declaring
 * a hex literal — three separate `L1_COLORS` maps had already drifted apart
 * (`#f97316` vs `#fb923c` for the same "Wants" root).
 */

export type L1Type = "needs" | "wants" | "savings";
export type AccountKind =
  "bank" | "cash" | "ewallet" | "credit" | "savings" | "other";

/** Mix a token with the page ground — used for the tinted category rails. */
export const tint = (color: string, percent: number) =>
  `color-mix(in oklch, ${color} ${percent}%, transparent)`;

export const NEUTRAL_DOT = "var(--acct-other)";

export const L1_COLOR: Record<string, string> = {
  needs: "var(--cat-needs)",
  wants: "var(--cat-wants)",
  savings: "var(--cat-savings)",
};

/** Colour for an L1 root, falling back to the neutral dot for unknown types. */
export const l1Color = (type: string | null | undefined) =>
  L1_COLOR[type ?? ""] ?? NEUTRAL_DOT;

export const ACCOUNT_COLOR: Record<AccountKind, string> = {
  bank: "var(--acct-bank)",
  cash: "var(--acct-cash)",
  ewallet: "var(--acct-ewallet)",
  credit: "var(--acct-credit)",
  savings: "var(--acct-savings)",
  other: "var(--acct-other)",
};

export const accountColor = (type: string | null | undefined) =>
  ACCOUNT_COLOR[(type ?? "other") as AccountKind] ?? NEUTRAL_DOT;

/** Tailwind class pairs for tinted account-type medallions. */
export const ACCOUNT_TINT: Record<AccountKind, { bg: string; icon: string }> = {
  bank: { bg: "bg-acct-bank/12 dark:bg-acct-bank/20", icon: "text-acct-bank" },
  cash: { bg: "bg-acct-cash/12 dark:bg-acct-cash/20", icon: "text-acct-cash" },
  ewallet: {
    bg: "bg-acct-ewallet/12 dark:bg-acct-ewallet/20",
    icon: "text-acct-ewallet",
  },
  credit: {
    bg: "bg-acct-credit/15 dark:bg-acct-credit/20",
    icon: "text-acct-credit",
  },
  savings: {
    bg: "bg-acct-savings/15 dark:bg-acct-savings/20",
    icon: "text-acct-savings",
  },
  other: { bg: "bg-muted", icon: "text-muted-foreground" },
};

/** Tailwind class pairs for L1 pills — dark text on a light tint of the same hue. */
export const L1_PILL: Record<L1Type, string> = {
  needs: "bg-success-soft text-success-strong",
  wants: "bg-warning-soft text-warning-strong",
  savings: "bg-info-soft text-info-strong",
};

export const L1_DOT_CLASS: Record<L1Type, string> = {
  needs: "bg-cat-needs",
  wants: "bg-cat-wants",
  savings: "bg-cat-savings",
};
