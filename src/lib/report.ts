import { format } from "date-fns";
import type { Account, Category, Transaction } from "@/lib/types";

export interface CategoryReportNode {
  id: string;
  name: string;
  level: 1 | 2 | 3;
  type?: "needs" | "wants" | "savings";
  amount: number;
  prevAmount?: number;
  children: CategoryReportNode[];
}

export interface ReportTransaction {
  date: string;
  time?: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  label: string;
  accountName: string;
  toAccountName?: string;
  note?: string;
}

export interface SplitSlice {
  type: "needs" | "wants" | "savings";
  name: string;
  amount: number;
  pct: number;
}

export interface CycleReport {
  userName: string;
  cycleLabel: string;
  generatedDate: string;
  startStr: string;
  endStr: string;
  income: number;
  expenses: number;
  net: number;
  hasPrev: boolean;
  prevIncome?: number;
  prevExpenses?: number;
  prevNet?: number;
  categoryTree: CategoryReportNode[];
  split: SplitSlice[];
  transactions: ReportTransaction[];
}

const TYPE_ORDER: Record<string, number> = { needs: 0, wants: 1, savings: 2 };

function aggregateSpending(
  txs: Transaction[],
  categoryMap: Map<string, Category>,
  targetLevel: 1 | 2 | 3
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const t of txs) {
    if (t.type !== "expense" || !t.categoryId) continue;
    let cat = categoryMap.get(t.categoryId);
    while (cat && cat.level !== targetLevel && cat.parentId) {
      cat = categoryMap.get(cat.parentId);
    }
    if (cat?.level === targetLevel) {
      result[cat.id] = (result[cat.id] ?? 0) + t.amount;
    }
  }
  return result;
}

export function buildCycleReport(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  start: Date,
  end: Date,
  opts: { userName: string; prev?: { start: Date; end: Date } }
): CycleReport {
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const cycleTx = transactions
    .filter((t) => t.date >= startStr && t.date <= endStr)
    .sort((a, b) => (b.date + (b.time ?? "")).localeCompare(a.date + (a.time ?? "")));

  const income = cycleTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = cycleTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const l1Spending = aggregateSpending(cycleTx, categoryMap, 1);
  const l2Spending = aggregateSpending(cycleTx, categoryMap, 2);
  const l3Spending = aggregateSpending(cycleTx, categoryMap, 3);

  // Previous-cycle comparison (optional)
  let hasPrev = false;
  let prevIncome: number | undefined;
  let prevExpenses: number | undefined;
  let prevNet: number | undefined;
  let prevL1: Record<string, number> = {};
  let prevL2: Record<string, number> = {};
  let prevL3: Record<string, number> = {};

  if (opts.prev) {
    const prevStartStr = format(opts.prev.start, "yyyy-MM-dd");
    const prevEndStr = format(opts.prev.end, "yyyy-MM-dd");
    const prevTx = transactions.filter(
      (t) => t.date >= prevStartStr && t.date <= prevEndStr
    );
    if (prevTx.length > 0) {
      hasPrev = true;
      prevIncome = prevTx
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      prevExpenses = prevTx
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
      prevNet = prevIncome - prevExpenses;
      prevL1 = aggregateSpending(prevTx, categoryMap, 1);
      prevL2 = aggregateSpending(prevTx, categoryMap, 2);
      prevL3 = aggregateSpending(prevTx, categoryMap, 3);
    }
  }

  const prevAt = (level: 1 | 2 | 3, id: string): number | undefined => {
    if (!hasPrev) return undefined;
    if (level === 1) return prevL1[id] ?? 0;
    if (level === 2) return prevL2[id] ?? 0;
    return prevL3[id] ?? 0;
  };

  const sortBySortOrder = (a: Category, b: Category) =>
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

  const l1Categories = categories
    .filter((c) => c.level === 1)
    .sort((a, b) => (TYPE_ORDER[a.type ?? ""] ?? 9) - (TYPE_ORDER[b.type ?? ""] ?? 9));

  const categoryTree: CategoryReportNode[] = l1Categories
    .filter((l1) => (l1Spending[l1.id] ?? 0) > 0)
    .map((l1) => ({
      id: l1.id,
      name: l1.name,
      level: 1 as const,
      type: l1.type,
      amount: l1Spending[l1.id] ?? 0,
      prevAmount: prevAt(1, l1.id),
      children: categories
        .filter((c) => c.level === 2 && c.parentId === l1.id && (l2Spending[c.id] ?? 0) > 0)
        .sort(sortBySortOrder)
        .map((l2) => ({
          id: l2.id,
          name: l2.name,
          level: 2 as const,
          amount: l2Spending[l2.id] ?? 0,
          prevAmount: prevAt(2, l2.id),
          children: categories
            .filter((c) => c.level === 3 && c.parentId === l2.id && (l3Spending[c.id] ?? 0) > 0)
            .sort(sortBySortOrder)
            .map((l3) => ({
              id: l3.id,
              name: l3.name,
              level: 3 as const,
              amount: l3Spending[l3.id] ?? 0,
              prevAmount: prevAt(3, l3.id),
              children: [],
            })),
        })),
    }));

  const split: SplitSlice[] = l1Categories
    .filter((l1) => l1.type && (l1Spending[l1.id] ?? 0) > 0)
    .map((l1) => ({
      type: l1.type!,
      name: l1.name,
      amount: l1Spending[l1.id] ?? 0,
      pct: expenses > 0 ? ((l1Spending[l1.id] ?? 0) / expenses) * 100 : 0,
    }));

  const reportTx: ReportTransaction[] = cycleTx.map((t) => {
    const category = t.categoryId ? categoryMap.get(t.categoryId) : null;
    const label =
      t.type === "expense"
        ? category?.name ?? "Expense"
        : t.type === "income"
        ? t.note?.trim() || "Income"
        : "Transfer";
    return {
      date: t.date,
      time: t.time,
      type: t.type,
      amount: t.amount,
      label,
      accountName: accountMap.get(t.accountId)?.name ?? "—",
      toAccountName: t.toAccountId ? accountMap.get(t.toAccountId)?.name ?? "—" : undefined,
      note: t.note?.trim() || undefined,
    };
  });

  return {
    userName: opts.userName,
    cycleLabel: `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`,
    generatedDate: format(new Date(), "d MMM yyyy"),
    startStr,
    endStr,
    income,
    expenses,
    net: income - expenses,
    hasPrev,
    prevIncome,
    prevExpenses,
    prevNet,
    categoryTree,
    split,
    transactions: reportTx,
  };
}
