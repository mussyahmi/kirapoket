import type { Category, Transaction } from "@/lib/types";

export type CycleRange = { start: Date; end: Date };

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * How many calendar days in the cycle (inclusive) fall on one of `weekdays`
 * (0 = Sunday). A cycle is at most ~5 weeks, so a day-by-day walk is fine.
 */
export function countWeekdays(weekdays: number[], range: CycleRange): number {
  const wanted = new Set(weekdays);
  const day = new Date(
    range.start.getFullYear(),
    range.start.getMonth(),
    range.start.getDate(),
  );
  const last = new Date(
    range.end.getFullYear(),
    range.end.getMonth(),
    range.end.getDate(),
  );
  let n = 0;
  while (day <= last) {
    if (wanted.has(day.getDay())) n++;
    day.setDate(day.getDate() + 1);
  }
  return n;
}

/**
 * Weekdays to pre-select when editing a budget saved before weekdays existed:
 * the weekdays of its old picked dates, or every day if it had none.
 */
export function initialWeekdays(
  c: Pick<Category, "budgetWeekdays" | "budgetSelectedDates">,
): number[] {
  if (c.budgetWeekdays?.length) return [...c.budgetWeekdays];
  if (c.budgetSelectedDates?.length) {
    const days = new Set(
      c.budgetSelectedDates.map((s) => {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d).getDay();
      }),
    );
    return [...days].sort();
  }
  return [...ALL_WEEKDAYS];
}

/**
 * Days a per-day budget covers in the given cycle. Weekday budgets are counted
 * from the cycle's own dates, so they stay right as cycles change length;
 * older budgets keep the count they were saved with (30 if none).
 */
export function dailyBudgetDays(
  c: Pick<Category, "budgetDays" | "budgetWeekdays">,
  range?: CycleRange,
): number {
  if (c.budgetWeekdays?.length && range)
    return countWeekdays(c.budgetWeekdays, range);
  return c.budgetDays ?? 30;
}

/**
 * Resolves a category's budget for a full salary cycle. A `daily` budget is
 * multiplied out by the days it covers in `range`; a `cycle` budget is taken
 * as-is. Returns 0 when the category has no budget set.
 */
export function effectiveCatBudget(
  c: Pick<Category, "budget" | "budgetType" | "budgetDays" | "budgetWeekdays">,
  range?: CycleRange,
): number {
  if (c.budget === undefined) return 0;
  if (c.budgetType === "daily") return c.budget * dailyBudgetDays(c, range);
  return c.budget;
}

/** All category ids in the subtree rooted at `rootId`, including the root. */
export function categorySubtreeIds(
  categories: Category[],
  rootId: string,
): Set<string> {
  const ids = new Set<string>([rootId]);
  let frontier = [rootId];
  while (frontier.length) {
    const next = categories
      .filter((c) => c.parentId && frontier.includes(c.parentId))
      .map((c) => c.id);
    for (const id of next) ids.add(id);
    frontier = next;
  }
  return ids;
}

export type BudgetImpact = {
  categoryName: string;
  budget: number;
  spent: number;
  projected: number;
};

/**
 * Budget impact of adding `amount` to the category `categoryId` within the
 * given cycle. Sums budget and spend across the category's whole subtree so it
 * works whether the transaction is tagged at a leaf or a parent level.
 * Returns null when the category has no budget to compare against.
 *
 * `excludeTransactionId` drops one transaction from the spent total — used
 * when editing so the row being changed isn't double-counted.
 */
export function computeBudgetImpact(params: {
  categories: Category[];
  transactions: Transaction[];
  categoryId: string;
  amount: number;
  cycleStartStr: string;
  cycleEndStr: string;
  excludeTransactionId?: string;
}): BudgetImpact | null {
  const {
    categories,
    transactions,
    categoryId,
    amount,
    cycleStartStr,
    cycleEndStr,
    excludeTransactionId,
  } = params;

  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return null;

  const subtree = categorySubtreeIds(categories, categoryId);
  const toDate = (str: string) => {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const cycle = { start: toDate(cycleStartStr), end: toDate(cycleEndStr) };

  const budget = categories
    .filter((c) => subtree.has(c.id))
    .reduce((s, c) => s + effectiveCatBudget(c, cycle), 0);

  if (budget <= 0) return null;

  const spent = transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.id !== excludeTransactionId &&
        t.categoryId != null &&
        subtree.has(t.categoryId) &&
        t.date >= cycleStartStr &&
        t.date <= cycleEndStr,
    )
    .reduce((s, t) => s + t.amount, 0);

  return {
    categoryName: cat.name,
    budget,
    spent,
    projected: spent + amount,
  };
}
