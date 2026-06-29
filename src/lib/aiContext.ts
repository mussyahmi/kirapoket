import { format } from "date-fns";
import { getSalaryCycleRange } from "@/lib/firestore";
import type { Account, Category, Transaction, Debt, UserProfile } from "@/lib/types";

const rm = (n: number) =>
  `RM${new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(n.toFixed(2)) || 0)}`;

const ACCOUNT_TYPE_LABEL: Record<Account["type"], string> = {
  bank: "bank",
  cash: "cash",
  ewallet: "e-wallet",
  credit: "credit",
  savings: "savings",
  other: "other",
};

/**
 * Builds a compact, human-readable snapshot of the user's CURRENT salary cycle
 * and accounts to send as grounding context to the AI assistant. Aggregates
 * transactions into category totals rather than dumping raw rows.
 */
export function buildAssistantContext({
  userProfile,
  accounts,
  categories,
  transactions,
  debts,
}: {
  userProfile: UserProfile | null;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  debts: Debt[];
}): string {
  const salaryDay = userProfile?.salaryDay ?? 25;
  const { start, end } = getSalaryCycleRange(salaryDay, new Date(), {
    cycleStarts: userProfile?.cycleStarts,
  });
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const rootOf = (id: string | undefined): Category | undefined => {
    let cat = id ? catMap[id] : undefined;
    while (cat && cat.level !== 1 && cat.parentId) cat = catMap[cat.parentId];
    return cat;
  };

  const cycleTx = transactions.filter((t) => t.date >= startStr && t.date <= endStr);
  const income = cycleTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = cycleTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const lines: string[] = [];

  lines.push(`Today: ${format(new Date(), "d MMM yyyy")}`);
  lines.push(`Current salary cycle: ${format(start, "d MMM yyyy")} to ${format(end, "d MMM yyyy")} (salary day ${salaryDay})`);
  lines.push("");

  // Accounts
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  lines.push("ACCOUNTS:");
  for (const a of accounts) {
    lines.push(`- ${a.name} (${ACCOUNT_TYPE_LABEL[a.type] ?? a.type}): ${rm(a.balance)}`);
  }
  lines.push(`Total across accounts: ${rm(totalBalance)}`);
  lines.push("");

  // Cycle totals
  lines.push("THIS CYCLE:");
  lines.push(`- Income: ${rm(income)}`);
  lines.push(`- Expenses: ${rm(expenses)}`);
  lines.push(`- Net (income - expenses): ${rm(income - expenses)}`);
  lines.push("");

  // Spending by category (L1 -> L3), only what has spend or a budget
  const l1Spend: Record<string, number> = {};
  const l3Spend: Record<string, number> = {};
  for (const t of cycleTx) {
    if (t.type !== "expense" || !t.categoryId) continue;
    const root = rootOf(t.categoryId);
    if (root) l1Spend[root.id] = (l1Spend[root.id] ?? 0) + t.amount;
    const leaf = catMap[t.categoryId];
    if (leaf?.level === 3) l3Spend[leaf.id] = (l3Spend[leaf.id] ?? 0) + t.amount;
  }

  const typeOrder: Record<string, number> = { needs: 0, wants: 1, savings: 2 };
  const l1s = categories
    .filter((c) => c.level === 1)
    .sort((a, b) => (typeOrder[a.type ?? ""] ?? 9) - (typeOrder[b.type ?? ""] ?? 9));

  const budgetLabel = (c: Category): string => {
    if (!c.budget || c.budget <= 0) return "";
    if (c.budgetType === "daily") return ` [budget ${rm(c.budget)}/day]`;
    return ` [budget ${rm(c.budget)}/cycle]`;
  };

  lines.push("SPENDING BY CATEGORY (this cycle):");
  for (const l1 of l1s) {
    const spent = l1Spend[l1.id] ?? 0;
    const l3Children = categories.filter(
      (c) => c.level === 3 && rootOf(c.id)?.id === l1.id
    );
    const relevantL3 = l3Children.filter((c) => (l3Spend[c.id] ?? 0) > 0 || (c.budget ?? 0) > 0);
    if (spent === 0 && relevantL3.length === 0) continue;
    lines.push(`- ${l1.name} (${l1.type ?? "?"}): ${rm(spent)}`);
    for (const c of relevantL3.sort((a, b) => (l3Spend[b.id] ?? 0) - (l3Spend[a.id] ?? 0))) {
      lines.push(`    - ${c.name}: ${rm(l3Spend[c.id] ?? 0)}${budgetLabel(c)}`);
    }
  }
  lines.push("");

  // Notable transactions (top 10 largest expenses this cycle)
  const topExpenses = cycleTx
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
  if (topExpenses.length) {
    lines.push(`LARGEST EXPENSES THIS CYCLE (top ${topExpenses.length} of ${cycleTx.filter((t) => t.type === "expense").length}):`);
    for (const t of topExpenses) {
      const cat = t.categoryId ? catMap[t.categoryId]?.name ?? "Uncategorised" : "Uncategorised";
      lines.push(`- ${t.date} | ${rm(t.amount)} | ${cat}${t.note ? ` | "${t.note}"` : ""}`);
    }
    lines.push("");
  }

  // Debts
  const outstanding = debts.filter((d) => !d.settled);
  if (outstanding.length) {
    const iOwe = outstanding.filter((d) => d.direction === "i_owe");
    const theyOwe = outstanding.filter((d) => d.direction === "they_owe");
    const sum = (arr: Debt[]) => arr.reduce((s, d) => s + d.amount, 0);
    lines.push("OUTSTANDING DEBTS:");
    lines.push(`- You owe (total ${rm(sum(iOwe))}): ${iOwe.map((d) => `${d.personName} ${rm(d.amount)}`).join(", ") || "none"}`);
    lines.push(`- Owed to you (total ${rm(sum(theyOwe))}): ${theyOwe.map((d) => `${d.personName} ${rm(d.amount)}`).join(", ") || "none"}`);
  } else {
    lines.push("OUTSTANDING DEBTS: none");
  }

  return lines.join("\n");
}
