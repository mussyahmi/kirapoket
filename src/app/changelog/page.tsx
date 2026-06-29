"use client";

import { ScrollTextIcon } from "lucide-react";

interface Release {
  version: string;
  dateRange: string;
  latest?: boolean;
  changes: { type: "feat" | "fix"; text: string }[];
}

// Bump this whenever the changelog is updated for a release.
const LAST_UPDATED = "29 June 2026";

// Each entry covers a minor version line (0.1.x / 0.2.x / 0.3.x).
// Patch is bumped on every commit — individual patches are not listed.
//
// ORDERING RULES (follow these when adding entries):
// • Array order: OLDEST version at index 0, NEWEST at the end — the page renders top→bottom.
// • Within each version's `changes` array: list all `feat` entries first, then all `fix` entries.
//   (The render already sorts by type, but keep the source consistent too.)
// • Always set `latest: true` only on the most recent release entry.
// • Aim for 4–8 bullets per minor version; combine related fixes into one sentence.
// • NEVER include admin panel features — the changelog is public.
const releases: Release[] = [
  {
    version: "0.11.x",
    dateRange: "2026-06-29 – present",
    latest: true,
    changes: [
      { type: "feat", text: "Pull down from the top of any page to refresh your data — especially handy in the installed home-screen app, where the browser's own pull-to-refresh isn't available" },
      { type: "feat", text: "Confirm before saving — adding or editing a transaction now shows a summary and exactly how each account balance will change before you commit; can be turned off under Settings → Transactions" },
      { type: "feat", text: "The transactions list now opens scoped to your current salary cycle, with the From and To dates pre-filled; Clear filters resets back to that range" },
      { type: "feat", text: "AI Spending Insights is being replaced by a new AI Assistant you'll be able to chat with about your spending and budgets — coming soon" },
      { type: "fix", text: "Filtering transactions by an account now also shows transfers into that account, not just transfers out of it" },
      { type: "fix", text: "PDF report no longer shows a negative \"-RM0.00\" remaining when a cycle breaks even, and the figure stays neutral instead of red" },
      { type: "fix", text: "Home dashboard no longer briefly flashes the wrong salary cycle while loading; the changelog now shows when it was last updated" },
    ],
  },
  {
    version: "0.10.x",
    dateRange: "2026-05-21 – 2026-06-29",
    latest: false,
    changes: [
      { type: "feat", text: "Settled debts now grouped by person — same collapsible person-cards as outstanding debts; group totals show the original pre-settlement amount so the figure stays meaningful, and pagination counts people rather than entries so a single person's long history can't blow past the page size" },
      { type: "feat", text: "New transaction page: animated skeleton pills now show while Accounts and Categories load — replaces the empty row and the misleading 'No categories' message that briefly appeared before data arrived" },
      { type: "feat", text: "Liquid Glass bottom navigation — a cleaner icon-only bar with a central + button; it picks up colour from the content scrolling behind it, the active tab sits under a glass highlight that glides between tabs with a subtle liquid stretch, and the whole bar shrinks toward its centre as you scroll down and expands as you scroll up, with a light haptic tap on supported devices" },
      { type: "feat", text: "Quick-add bottom sheet — the nav's + button and the Add button on the Transactions page now slide the new-transaction form up as a bottom sheet with a sticky Add button, instead of opening a separate page; the nav tucks away while it's open" },
      { type: "feat", text: "Liquid Glass surfaces across dialogs, toasts, dropdown menus, and the quick-add sheet — a consistent translucent material with backdrop blur, saturation, and a lit top edge, matching the iOS 26 / macOS Tahoe design language" },
      { type: "feat", text: "Collapsible category breakdowns — Spending by Category on Home and By Category on Budget now fold up per top-level group (Needs / Wants / Savings); the largest group opens by default and your expand/collapse choices are remembered" },
      { type: "fix", text: "Transactions page header: Clear filters and Export buttons collapse to icon-only on mobile when filters are active so the primary Add button no longer gets cut off; full labels return on larger screens" },
      { type: "fix", text: "AI Insights return date pushed back to 29 June 2026" },
      { type: "fix", text: "Mobile header is now a solid bar that matches the page background and stays in place, replacing the translucent bar that hid on scroll" },
      { type: "fix", text: "Transactions tab stays accessible once you've logged at least one transaction, even if account or salary setup later looks incomplete" },
      { type: "fix", text: "The central + button no longer briefly disappears on refresh while your profile and accounts finish loading" },
      { type: "fix", text: "Bottom navigation polish — wider side margins give the bar more breathing room, the active-tab highlight drops its glassy ring outline for a cleaner fill, and tapping a tab now lets the highlight glide all the way over before the page changes" },
      { type: "fix", text: "Dialogs now sit above the header instead of slipping behind it — the Edit Item and other modals are no longer clipped by the top bar" },
      { type: "fix", text: "Date pickers fill their box cleanly — the empty area below the calendar grid now matches the picker's background instead of showing a darker band" },
    ],
  },
  {
    version: "0.9.x",
    dateRange: "2026-05-20 – 2026-05-21",
    latest: false,
    changes: [
      { type: "feat", text: "PDF monthly report — generate a polished, paginated PDF for any salary cycle from the home page; includes income/expenses/remaining summary, a spending split bar, a hierarchical category breakdown with cycle-over-cycle deltas, and a colour-coded transactions table with running header on continuation pages" },
      { type: "feat", text: "CSV transaction export — export the current filtered list from the transactions page; filename reflects the active date range when one is set, making it easy to tell multiple exports apart" },
      { type: "feat", text: "Previous-cycle comparison everywhere — the Summary card and every category row (L1, L2, L3) on the home page show the change vs the previous full cycle, colour-coded by direction; the same comparison appears in the PDF report" },
      { type: "feat", text: "Home dashboard refresh — pie chart replaced with a compact horizontal stacked bar (matching the PDF); Spending by Category now shows a 'vs previous full cycle' subtitle; amount and delta lay out as two right-aligned columns on wider screens" },
      { type: "feat", text: "Download report shortcut — Report button now lives in the cycle navigation row so each cycle can be saved as a PDF in one tap; landing page demo updated to reflect the new design" },
      { type: "feat", text: "Summary card polish — colour-coded top-bars per metric (green Income / red Expenses / blue Remaining) replace the vertical dividers; delta indicators now render with crisper arrow icons instead of Unicode characters; landing page demo updated to match" },
      { type: "fix", text: "Summary card: Remaining figure turns red when negative (was always blue) — matches the PDF and gives a clear visual flag when a cycle runs into a deficit" },
      { type: "fix", text: "Spending by Category amounts now right-align flush across all three levels — fixed a subtle misalignment caused by negative-margin overflow on the row hover backgrounds" },
      { type: "fix", text: "Budget page: removed unnecessary horizontal padding on the Unallocated row" },
      { type: "fix", text: "Cycle-over-cycle comparison reliability — fixed previous-cycle detection for users with salary day 26 or later (was matching the current cycle, showing 'same as last' on every metric); home page now shows 'new' for categories that didn't exist last cycle (matching the PDF); L3 row deltas in the PDF report keep their red/green colour instead of being rendered in muted grey" },
    ],
  },
  {
    version: "0.8.x",
    dateRange: "2026-05-04 – 2026-05-20",
    latest: false,
    changes: [
      { type: "feat", text: "Partner view — invite your partner by email so they can see your finances in read-only mode; accept or decline the invite right from the app; pause and resume the view from Settings at any time" },
      { type: "feat", text: "Partner invites now show each other's name on both sides — the sender sees who they invited, and the recipient sees who sent the invite" },
      { type: "feat", text: "Privacy Policy page — linked from the landing page footer, sign-in notice, and Settings; explains what data KiraPoket collects and how it's used" },
      { type: "feat", text: "Edit your display name from Settings — tap the pencil icon next to your name to update it; the change syncs to your partner's view instantly; profile card shows a skeleton while loading" },
      { type: "feat", text: "Recent transactions on the home page and the full transactions list are now grouped by date — today's and yesterday's entries show as 'Today' and 'Yesterday' instead of the full date" },
      { type: "feat", text: "Support dialog on mobile: QR codes are now shown as a carousel with previous/next arrows and dot indicators instead of a cramped side-by-side layout" },
      { type: "feat", text: "Onboarding redesign — the Get Started card now focuses on one step at a time with a progress bar, a description, and a clear action button; completing each step shows a modal pointing you to the next one; finishing all steps shows a completion message" },
      { type: "feat", text: "Account balance protection — expenses and transfers are rejected before saving if they would make the account balance negative; the error message tells you exactly which account is short and by how much" },
      { type: "feat", text: "Budget summary redesigned — split into Allocation (budgeted, unbudgeted spending, over-budget spending, unallocated) and Actuals (spent, remaining, progress bar) sections; tapping Unbudgeted or Over-budget rows shows a short explanation inline; removed the copy-as-image and censor toggle" },
      { type: "feat", text: "Adding or editing a transaction now shows the selected account's balance and the projected balance after the change — the panel turns red and warns you if it would overdraw the account; works for expenses, income, and both accounts in a transfer" },
      { type: "fix", text: "Your saved display name is now used consistently in partner invites, the landing page, and Settings instead of defaulting to the Google account name" },
      { type: "fix", text: "Partner view paused/resumed state now persists across app restarts" },
      { type: "fix", text: "Decline button is hidden while an invite acceptance is in progress to prevent a UI glitch" },
      { type: "fix", text: "iOS Add to Home Screen: navigating to other pages after a version update no longer shows stale content — the app now performs a proper full reload instead of a soft refresh" },
      { type: "fix", text: "Tapping a filtered-transactions link on the home page no longer merges with previously saved filter state; transaction subtitle now shows the note instead of the date" },
      { type: "fix", text: "Home dashboard summary: renamed 'Savings' to 'Balance' — the figure is income minus expenses for the cycle, not intentional savings" },
      { type: "fix", text: "Transaction filter state is no longer saved across sessions — filters now only restore when returning directly from the edit page, so visiting the list fresh always starts clean" },
      { type: "fix", text: "Transfer notes now appear in the recent transactions list on the home dashboard and in the full transactions list" },
      { type: "fix", text: "Delete account now works reliably — all your data is wiped and you are signed out immediately" },
      { type: "fix", text: "Account balances are now stored with exactly two decimal places — floating point drift from repeated transactions is eliminated" },
      { type: "fix", text: "Home and budget pages: tapping anywhere on a category row now navigates to transactions — the entire row is a tap target, not just the label text" },
      { type: "fix", text: "Home dashboard and landing page: renamed 'Balance' to 'Remaining' — the figure is income minus expenses for the cycle" },
    ],
  },
  {
    version: "0.7.x",
    dateRange: "2026-04-27 – 2026-05-04",
    latest: false,
    changes: [
      { type: "feat", text: "Accounts: added Savings type (piggy bank icon, teal colour) — great for Maybank Tabung, ASB, and other savings pockets" },
      { type: "feat", text: "Home page: tap any account row to jump straight to its filtered transaction list" },
      { type: "feat", text: "Budget page: tap an L3 category item to open a detail modal — budget, spent, note, and links shown; Edit opens the full edit form inline; Transactions navigates pre-filtered to that category and cycle" },
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
      { type: "fix", text: "Reduced Firestore reads — transaction fetches are now capped at 500 most recent; profile saves no longer trigger an unnecessary re-read" },
      { type: "fix", text: "Debts: settling or paying a debt no longer wipes the note — partial updates now preserve all fields not included in the change" },
      { type: "fix", text: "Debts: payment transaction now inherits the debt note (e.g. 'gula cakery') instead of the generic 'Payment to [person]'" },
      { type: "fix", text: "Debts: editing a fully-paid debt (amount 0) no longer blocked — 0 is now a valid amount when editing" },
      { type: "fix", text: "AI Insights temporarily unavailable until 28 May 2026 — a friendly message is shown with a Buy Me a Coffee button to help keep the feature running; skeleton no longer shows indefinitely when insights can't load" },
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
          <p className="text-xs text-muted-foreground mt-0.5">Last updated {LAST_UPDATED}</p>
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
