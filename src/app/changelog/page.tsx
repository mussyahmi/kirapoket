"use client";

import { ScrollTextIcon } from "lucide-react";

interface Release {
  version: string;
  dateRange: string;
  changes: { type: "feat" | "fix"; text: string }[];
}

// Each entry covers a minor version line (0.1.x / 0.2.x / 0.3.x).
// Patch is bumped on every commit — individual patches are not listed.
const releases: Release[] = [
  {
    version: "0.4.x",
    dateRange: "2026-03-30",
    changes: [
      { type: "feat", text: "Changelog page — see what's new in KiraPoket" },
      { type: "fix", text: "Changelog is now accessible without logging in — share the link freely" },
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
                  <span className="text-xs text-muted-foreground">{release.dateRange}</span>
                </div>

                <ul className="space-y-1.5">
                  {release.changes.map((change, i) => (
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
