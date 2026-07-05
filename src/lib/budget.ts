import type { Category, Transaction } from "@/lib/types";

/**
 * Resolves a category's budget for a full salary cycle. A `daily` budget is
 * multiplied out by its configured day count; a `cycle` budget is taken as-is.
 * Returns 0 when the category has no budget set.
 */
export function effectiveCatBudget(
  c: Pick<Category, "budget" | "budgetType" | "budgetDays">
): number {
  if (c.budget === undefined) return 0;
  if (c.budgetType === "daily") return c.budget * (c.budgetDays ?? 30);
  return c.budget;
}

/** All category ids in the subtree rooted at `rootId`, including the root. */
export function categorySubtreeIds(
  categories: Category[],
  rootId: string
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

  const budget = categories
    .filter((c) => subtree.has(c.id))
    .reduce((s, c) => s + effectiveCatBudget(c), 0);

  if (budget <= 0) return null;

  const spent = transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.id !== excludeTransactionId &&
        t.categoryId != null &&
        subtree.has(t.categoryId) &&
        t.date >= cycleStartStr &&
        t.date <= cycleEndStr
    )
    .reduce((s, t) => s + t.amount, 0);

  return {
    categoryName: cat.name,
    budget,
    spent,
    projected: spent + amount,
  };
}
