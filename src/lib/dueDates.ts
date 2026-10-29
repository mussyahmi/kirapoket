import type { Category, Debt, Transaction } from "./types";
import { isOwnExpense } from "./income";

/**
 * Recurring bills, worked out rather than recorded.
 *
 * A category with a `dueDay` is a commitment that comes round every month.
 * Nothing stores whether it has been paid: that is derived from this cycle's
 * spending against the category's budget, so there is no flag to reset at the
 * turn of a cycle and no way for a status to disagree with the transactions
 * it claims to describe.
 *
 * The budget doubles as the expected amount because, for a bill, it already
 * is one: Home Loan budgets RM2,079.00 and costs RM2,079.00. That matters for
 * a category like CelcomDigi, where small top-ups sit alongside the monthly
 * bill and "has anything been spent here" would call it settled after RM5.
 */
export type DueState = "paid" | "partial" | "due" | "overdue";

export interface DueStatus {
  category: Category;
  state: DueState;
  /** Spent in this category so far this cycle. */
  paid: number;
  /** The bill itself, when a budget gives us one. */
  expected?: number;
  /** Still owing, when there is an expected amount to measure against. */
  outstanding?: number;
  /** The due day resolved into a real date inside this cycle. */
  date: Date;
  /** Whole days from today; negative once the date has passed. */
  daysAway: number;
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * The cycle spans two calendar months, so a due day of 29 could fall in
 * either. Take whichever occurrence lands inside the cycle, and clamp to the
 * month's length so day 31 still resolves in a 30-day month.
 */
export function dueDateInCycle(
  dueDay: number,
  start: Date,
  end: Date,
): Date | null {
  for (const base of [start, end]) {
    const year = base.getFullYear();
    const month = base.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const d = new Date(year, month, Math.min(dueDay, lastDay));
    if (d >= startOfDay(start) && d <= startOfDay(end)) return d;
  }
  return null;
}

/**
 * Every bill due in this cycle, soonest first, with what is still owing.
 * Categories without a `dueDay` are ordinary spending and never appear.
 */
export function dueThisCycle(
  categories: Category[],
  cycleTransactions: Transaction[],
  start: Date,
  end: Date,
  today = new Date(),
): DueStatus[] {
  const spentBy: Record<string, number> = {};
  for (const t of cycleTransactions) {
    if (!isOwnExpense(t) || !t.categoryId) continue;
    spentBy[t.categoryId] = (spentBy[t.categoryId] ?? 0) + t.amount;
  }

  const now = startOfDay(today);
  const out: DueStatus[] = [];

  for (const c of categories) {
    if (!c.dueDay) continue;
    const date = dueDateInCycle(c.dueDay, start, end);
    if (!date) continue;

    const paid = spentBy[c.id] ?? 0;
    // A per-day budget is a spending allowance, not a bill, so it never
    // stands in as the expected amount.
    const expected =
      c.budget && c.budget > 0 && c.budgetType !== "daily" ? c.budget : undefined;
    const settled =
      expected !== undefined ? paid >= expected - 0.005 : paid > 0;
    const daysAway = Math.round(
      (date.getTime() - now.getTime()) / 86_400_000,
    );

    const state: DueState = settled
      ? "paid"
      : daysAway < 0
        ? "overdue"
        : paid > 0
          ? "partial"
          : "due";

    out.push({
      category: c,
      state,
      paid,
      expected,
      outstanding:
        expected !== undefined ? Math.max(expected - paid, 0) : undefined,
      date,
      daysAway,
    });
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** What is still owed before payday: the figure free-to-spend must respect. */
export function outstandingBeforePayday(due: DueStatus[]): number {
  return due
    .filter((d) => d.state !== "paid")
    .reduce((s, d) => s + (d.outstanding ?? 0), 0);
}

/**
 * What a debt asks for at its next due date. On a debt repaid in fixed
 * monthly amounts that is one instalment, not the whole balance: a car loan
 * of RM12,000 does not fall due before payday, RM400 of it does. The final
 * instalment is capped at whatever is actually left.
 */
export function amountDueNow(
  d: Pick<Debt, "amount" | "installmentAmount">,
): number {
  if (d.installmentAmount && d.installmentAmount > 0)
    return Math.min(d.installmentAmount, d.amount);
  return d.amount;
}
