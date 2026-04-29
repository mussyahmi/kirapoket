"use client";

import { ScrollTextIcon } from "lucide-react";

interface Release {
  version: string;
  dateRange: string;
  latest?: boolean;
  changes: { type: "feat" | "fix"; text: string }[];
}

// Each entry covers a minor version line (0.1.x / 0.2.x / 0.3.x).
// Patch is bumped on every commit — individual patches are not listed.
const releases: Release[] = [
  {
    version: "0.7.x",
    dateRange: "2026-04-27 – present",
    latest: true,
    changes: [
      { type: "feat", text: "AI spending insights on the budget page — personalised summary, do's, and don'ts powered by Gemini; factors in transaction notes for specific tips like 'car service' or 'birthday dinner'" },
      { type: "feat", text: "Insights are cached as one record per user and rate-limited to once per day — the refresh button shows exactly when it unlocks and stays disabled until your data changes" },
      { type: "feat", text: "Admin panel now shows each user's UID alongside their email" },
      { type: "feat", text: "Daily budget day-picker now has a Clear all button — deselect all chosen days in one tap" },
      { type: "feat", text: "Each salary cycle remembers its own start date — editing one cycle no longer overwrites another; removed the Early arrival buffer setting" },
      { type: "feat", text: "Cycle start banner on all cycles — tap Set date on any past cycle to correct it; cycle end adjusts to the day before the next cycle's start; home page remembers the last cycle you viewed" },
      { type: "feat", text: "Budget page improvements: spending progress bar, inline totals per L1 category, highlighted unallocated row (blue = surplus, red = overspent), and a shortcut to Categories" },
      { type: "feat", text: "Install App card in Settings — Android shows a native install button; iOS Safari shows the 3-step Add to Home Screen guide; card hides once the app is already installed" },
      { type: "feat", text: "Accounts: drag-to-reorder — grab the handle to rearrange; order persists and reflects in transaction form dropdowns and the home page list" },
      { type: "feat", text: "Accounts: colour-coded type icons — bank (blue), cash (green), e-wallet (purple), credit (orange); total balance card shows a proportional type breakdown bar" },
      { type: "feat", text: "Accounts: tap a row to see a detail sheet with balance, type, and quick actions — Transactions, Edit, Delete" },
      { type: "feat", text: "Home accounts section collapses to 4 items by default with an expand toggle; each row has a colour dot matching its account type" },
      { type: "feat", text: "Category item modal redesigned — budget shown in a coloured highlight block, note and links in soft panels, delete button added directly in the modal" },
      { type: "feat", text: "Transaction detail modal redesigned — type icon in coloured header, amount in highlight block, compact Edit + Delete footer matching the account and category modals" },
      { type: "fix", text: "AI insights: fixed stale cooldown check, quota errors now show a clear message, stored results are reused during cooldown, and responses are English only" },
      { type: "fix", text: "Prev/next cycle chevrons hidden when irrelevant; account balances hidden on past cycles to avoid confusion" },
    ],
  },
  {
    version: "0.6.x",
    dateRange: "2026-04-17 – 2026-04-27",
    changes: [
      { type: "feat", text: "Visual revamp — warm coral accent replaces indigo throughout the app" },
      { type: "feat", text: "New typeface: Nunito — rounder and friendlier than Inter across all text" },
      { type: "feat", text: "Mobile bottom nav now shows text labels under each icon" },
      { type: "feat", text: "Mobile header and bottom nav use frosted glass (backdrop blur)" },
      { type: "feat", text: "KP logo badge added to mobile header and desktop sidebar" },
      { type: "feat", text: "Slightly more rounded corners across all cards and buttons" },
      { type: "feat", text: "Warm-tinted dark mode — replaces cold charcoal with brown-tinted dark backgrounds" },
    ],
  },
  {
    version: "0.5.x",
    dateRange: "2026-04-06 – present",
    changes: [
      { type: "feat", text: "Debts: link a transaction when adding a debt — pick an account and an income/expense is recorded automatically" },
      { type: "feat", text: "Debts: Pay button on \"I Owe\" debts — record partial or full payments that flow to your account and reduce the balance" },
      { type: "feat", text: "Debts: Collect button on \"They Owe Me\" debts — record money you received back into an account" },
      { type: "feat", text: "Debts: original amount shown as strikethrough when a debt has been partially paid" },
      { type: "feat", text: "Debts: quick-select chips for known person names when adding a new debt" },
      { type: "feat", text: "Debts: Record Transaction option in the ··· menu — for existing debts that have no linked transaction yet" },
      { type: "feat", text: "Two new protected default categories: Debt Repayment (under Needs) and Money Lent (under Savings) — auto-added to existing accounts on next login, person names auto-added as items when a debt transaction is recorded" },
      { type: "feat", text: "App version shown at the bottom of the sidebar (desktop) and menu (mobile)" },
      { type: "feat", text: "Categories: tap a category item to see a Transactions button — jump straight to its filtered transaction list" },
      { type: "feat", text: "Accounts: deleting an account is blocked if transactions are linked to it — a link jumps straight to the filtered transaction list" },
      { type: "fix", text: "iOS: signing out then signing in no longer auto-selects the previous Google account — the account picker is always shown" },
      { type: "fix", text: "Give Feedback and Buy Me a Coffee now open reliably on mobile — tapping no longer does nothing" },
      { type: "fix", text: "Buy Me a Coffee dialog no longer closes when tapping its content on mobile" },
    ],
  },
  {
    version: "0.4.x",
    dateRange: "2026-03-30 – 2026-04-06",
    changes: [
      { type: "feat", text: "Changelog page — see what's new in KiraPoket" },
      { type: "feat", text: "\"Add to Home Screen\" prompt on the landing page — one tap to install on Android, guided steps for iOS Safari" },
      { type: "feat", text: "Transactions: filter by category — tap any L2 or L3 category name on the budget page to jump straight to its transactions" },
      { type: "feat", text: "Transactions: daily net total shown next to each date header — green for net income, red for net expense" },
      { type: "feat", text: "Transactions: delete button moved into the detail popup — no more accidental deletes from the list" },
      { type: "feat", text: "Transaction time is now shown on the home page and in the transaction detail popup" },
      { type: "feat", text: "Transactions sort by time within the same day — most recent first" },
      { type: "feat", text: "Transfer transactions now show a distinct icon on the home page" },
      { type: "feat", text: "Landing page mock dashboard improvements: Needs/Wants/Savings pie chart, cycle navigation arrows, and timestamps on transactions" },
      { type: "feat", text: "Home page spending breakdown: tap any category name to jump to its filtered transaction list" },
      { type: "feat", text: "Categories: deleting a subcategory is blocked if it still has items inside — clear the items first" },
      { type: "feat", text: "Categories: deleting an item is blocked if transactions are linked to it — a link jumps straight to the filtered transaction list" },
      { type: "feat", text: "Give Feedback and Buy Me a Coffee — accessible from the sidebar and mobile menu" },
      { type: "fix", text: "Changelog: accessible without login, back button works from direct links, no duplicate back buttons, link added to landing page footer" },
      { type: "fix", text: "\"New version available\" now refreshes all open tabs, not just the one you tapped Refresh on" },
      { type: "fix", text: "Transaction list: tapping a row now shows full details (amount, date, account, subcategory, note) in a popup — edit button moved inside" },
      { type: "fix", text: "\"View all\" link on the home page now appears correctly in the top-right corner of the Recent Transactions section" },
      { type: "fix", text: "Installing to home screen now opens the app at the correct starting page" },
      { type: "fix", text: "Salary day selection now immediately reflects on the home page after tapping" },
      { type: "fix", text: "New accounts no longer end up with missing or incomplete default categories — any gaps are automatically filled in on the next login" },
    ],
  },
  {
    version: "0.3.x",
    dateRange: "2026-03-30",
    changes: [
      { type: "feat", text: "Grouped unsettled debts by person" },
      { type: "feat", text: "Welcome screen entrance animations" },
      { type: "fix", text: "Open-in-browser banner when launched inside Threads or Android webviews" },
      { type: "fix", text: "Landing page now shows instantly" },
      { type: "fix", text: "Debt cards no longer flicker on load" },
      { type: "fix", text: "Debts within a group sort correctly by date" },
      { type: "fix", text: "Home screen loading flash is gone" },
      { type: "fix", text: "Home page skeletons look more accurate while data loads" },
    ],
  },
  {
    version: "0.2.x",
    dateRange: "2026-03-26 – 2026-03-30",
    changes: [
      { type: "feat", text: "Budget page — set spending targets per category and track progress" },
      { type: "feat", text: "PWA support — install to your home screen, works offline" },
      { type: "feat", text: "New version toast when an update is available" },
      { type: "feat", text: "Inline edit for forecast income items on budget page" },
      { type: "feat", text: "Copy budget as image, with a censor toggle before sharing" },
      { type: "feat", text: "Debt tracker — track money you owe and money owed to you, with optional due dates" },
      { type: "feat", text: "Bottom nav trimmed to 4 core pages; others moved to header menu" },
      { type: "feat", text: "Debt badge on nav when there are unsettled debts" },
      { type: "feat", text: "Add button moved to the page header" },
      { type: "feat", text: "Budget: strikethrough on categories with no remaining budget" },
      { type: "feat", text: "Budget: unbudgeted spending shows as its own row" },
      { type: "feat", text: "Budget: drag to reorder forecast income items" },
      { type: "feat", text: "Income transactions show their note as the title in the list" },
      { type: "feat", text: "Load more button on transactions and settled debts lists" },
      { type: "feat", text: "Spending by category shows full L1 → L2 → L3 hierarchy" },
      { type: "fix", text: "iOS PWA auth fixes — no more redirect loops or full-page spinner on launch" },
      { type: "fix", text: "Transaction form dialogs are now scrollable on mobile" },
      { type: "fix", text: "Calendar date picker rebuilt with larger touch targets on mobile" },
      { type: "fix", text: "iOS auto-zoom on input tap is now prevented" },
      { type: "fix", text: "Spending chart labels moved to a legend below on small screens" },
      { type: "fix", text: "Editing a transaction no longer throws a Firestore error" },
      { type: "fix", text: "\"Over budget\" warning only appears on categories that actually have a budget set" },
    ],
  },
  {
    version: "0.1.x",
    dateRange: "2026-03-25",
    changes: [
      { type: "feat", text: "KiraPoket launched — personal expense tracker for your pocket" },
      { type: "feat", text: "Sign in with Google" },
      { type: "feat", text: "Income and expense transactions" },
      { type: "feat", text: "Accounts — bank, cash, e-wallet, credit, and more" },
      { type: "feat", text: "3-level categories (Needs / Wants / Savings → subcategory → item)" },
      { type: "feat", text: "Transfer transactions between accounts" },
      { type: "feat", text: "Salary cycle — all stats tied to your pay period" },
      { type: "feat", text: "Hide / show balance toggle" },
      { type: "feat", text: "Light and dark mode" },
    ],
  },
];

const typeBadge: Record<"feat" | "fix", string> = {
  feat: "bg-primary/10 text-primary",
  fix: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const typeLabel: Record<"feat" | "fix", string> = {
  feat: "New",
  fix: "Fix",
};

export default function ChangelogPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ScrollTextIcon className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Changelog</h1>
          <p className="text-sm text-muted-foreground">What&apos;s new in KiraPoket</p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-8">
          {releases.map((release) => (
            <div key={release.version} className="relative pl-7">
              <div className="absolute left-0 top-1.5 size-[10px] rounded-full border-2 border-primary bg-background" />

              <div className="space-y-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{release.version}</span>
                  {release.latest && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground leading-tight">Latest</span>
                  )}
                  <span className="text-xs text-muted-foreground">{release.dateRange}</span>
                </div>

                <ul className="space-y-1.5">
                  {[...release.changes].sort((a, b) => a.type === b.type ? 0 : a.type === "feat" ? -1 : 1).map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={`shrink-0 mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${typeBadge[change.type]}`}>
                        {typeLabel[change.type]}
                      </span>
                      <span className="text-foreground/80 leading-snug">{change.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
