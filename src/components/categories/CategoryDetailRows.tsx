"use client";

import type { Category } from "@/lib/types";
import {
  effectiveCatBudget,
  dailyBudgetDays,
  type CycleRange,
} from "@/lib/budget";
import { cn } from "@/lib/utils";
import { SpendMeter } from "@/components/common/SpendMeter";

/**
 * What a level-3 category is worth knowing at a glance: its budget, when its
 * bill falls due, what has gone through it this cycle, and anything written
 * down about it.
 *
 * Categories and Budget each had their own version of this panel, and each
 * was missing a row the other had: Budget showed Spent but not Due, Categories
 * showed Due but not Spent. Both facts are true on both screens, so there is
 * one panel now.
 */
const fmt = (n: number) =>
  new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(n);

export function CategoryDetailRows({
  category,
  cycle,
  spent,
}: {
  category: Category;
  cycle: CycleRange;
  /** Omitted where the caller has no spending figure to hand. */
  spent?: number;
}) {
  const hasBudget = category.budget !== undefined;
  const budgetTotal = hasBudget ? effectiveCatBudget(category, cycle) : 0;
  const remaining = budgetTotal - (spent ?? 0);
  // Exactly on budget is its own answer. Treating it as "under" says there is
  // room left when every ringgit is gone, which is the same mistake as
  // calling a category with no budget under one.
  const state =
    spent === undefined || !hasBudget || budgetTotal <= 0
      ? "none"
      : Math.abs(remaining) < 0.005
        ? "exact"
        : remaining < 0
          ? "over"
          : "under";

  const hasAnything =
    hasBudget ||
    category.dueDay !== undefined ||
    spent !== undefined ||
    !!category.note ||
    (category.links?.length ?? 0) > 0;

  if (!hasAnything) {
    return (
      <p className="text-sm text-muted-foreground">No details added yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Budget and spend are one fact, not two. Shown together with a meter
          so the relationship is the thing you read first, rather than two
          sums you have to compare yourself. */}
      {(hasBudget || spent !== undefined) && (
        <div className="space-y-3 rounded-xl bg-muted/50 px-4 py-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Spent
              </p>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  state === "over"
                    ? "text-danger"
                    : state === "under"
                      ? "text-success"
                      : "",
                )}
              >
                {fmt(spent ?? 0)}
              </p>
            </div>
            {hasBudget && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">of</p>
                <p className="text-sm font-semibold tabular-nums">
                  {fmt(budgetTotal)}
                </p>
                {category.budgetType === "daily" && (
                  <p className="text-xs text-muted-foreground">
                    {fmt(category.budget ?? 0)}/day &times;{" "}
                    {dailyBudgetDays(category, cycle)} days
                  </p>
                )}
              </div>
            )}
          </div>
          {state !== "none" && (
            <SpendMeter
              spent={spent ?? 0}
              total={budgetTotal}
              remaining={remaining}
              barClassName={
                state === "over"
                  ? "bg-danger"
                  : state === "exact"
                    ? "bg-warning"
                    : "bg-success"
              }
            />
          )}
          {state !== "none" && (
            <p
              className={cn(
                "text-xs font-medium",
                state === "over"
                  ? "text-danger"
                  : state === "exact"
                    ? "text-warning-strong"
                    : "text-muted-foreground",
              )}
            >
              {state === "over"
                ? `Over by ${fmt(Math.abs(remaining))}`
                : state === "exact"
                  ? "Exactly on budget, nothing left"
                  : `${fmt(remaining)} left this cycle`}
            </p>
          )}
        </div>
      )}
      {category.dueDay !== undefined && (
        <div className="flex items-center justify-between gap-3 px-1">
          <span className="text-xs text-muted-foreground">Due</span>
          <span className="text-xs font-medium tabular-nums">
            Day {category.dueDay} each month
          </span>
        </div>
      )}
      {category.note && (
        <div className="space-y-1 rounded-xl bg-muted/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Note
          </p>
          <p className="text-sm break-words whitespace-pre-wrap">
            {category.note}
          </p>
        </div>
      )}
      {category.links && category.links.length > 0 && (
        <div className="space-y-2 rounded-xl bg-muted/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Links
          </p>
          {category.links.map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-sm text-primary link-underline"
            >
              {link}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
