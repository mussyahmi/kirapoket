import type { IncomeSource, Transaction } from "./types";

/**
 * Not every ringgit that lands in an account is income. A loan disbursement, an
 * EPF withdrawal and a refund all arrive the same way a salary does, and
 * counting them together makes a cycle you borrowed your way through look like
 * a cycle you earned your way through.
 *
 * Only "earned" and "gift" count towards income. The rest are reported
 * separately so the money is still visible — just not as income.
 */
export const INCOME_SOURCES: {
  value: IncomeSource;
  label: string;
  hint: string;
  /** Counts towards the income total. */
  isIncome: boolean;
}[] = [
  {
    value: "earned",
    label: "Earned",
    hint: "Salary, freelance, bonus, dividends.",
    isIncome: true,
  },
  {
    value: "gift",
    label: "Gift",
    hint: "Duit raya, angpau, wedding money, government aid. Counts as income.",
    isIncome: true,
  },
  {
    value: "returned",
    label: "Returned",
    hint: "Refunds, cashback, work claims, a friend paying you back. Excluded from your income total.",
    isIncome: false,
  },
  {
    value: "borrowed",
    label: "Borrowed",
    hint: "Loans, BNPL, credit. Excluded from your income total.",
    isIncome: false,
  },
  {
    value: "withdrawn",
    label: "Withdrawn",
    hint: "From your own savings: EPF, Tabung Haji, FD. Excluded from your income total.",
    isIncome: false,
  },
  {
    value: "held",
    label: "Held for others",
    hint: "Money you're spending for someone else, like a group collection. Excluded from your income total.",
    isIncome: false,
  },
];

export const DEFAULT_INCOME_SOURCE: IncomeSource = "earned";

/** Transactions logged before `source` existed are treated as earned income. */
export function incomeSourceOf(tx: Transaction): IncomeSource {
  return tx.source ?? DEFAULT_INCOME_SOURCE;
}

/** True for income that should count towards the income total. */
export function isEarnedIncome(tx: Transaction): boolean {
  return tx.type === "income" && incomeSourceMeta(incomeSourceOf(tx)).isIncome;
}

/**
 * True for spending that's actually yours. Expenses paid for others (the
 * hampers bought with the family's money) still move the account balance but
 * stay out of spending totals and budgets.
 */
export function isOwnExpense(tx: Transaction): boolean {
  return tx.type === "expense" && !tx.forOthers;
}

/**
 * Income that is NOT income: borrowed or withdrawn from savings. Refunds are
 * excluded here too — they're money back rather than money in, and surfacing
 * them alongside borrowing would overstate the warning.
 */
export function isNonIncomeInflow(tx: Transaction): boolean {
  if (tx.type !== "income") return false;
  const source = incomeSourceOf(tx);
  return source === "borrowed" || source === "withdrawn";
}

const sum = (txs: Transaction[]) => txs.reduce((s, t) => s + t.amount, 0);

/** The income total — earned income and gifts. */
export function sumEarnedIncome(txs: Transaction[]): number {
  return sum(txs.filter(isEarnedIncome));
}

/** Borrowed + withdrawn, for the dashboard's separate line. */
export function sumNonIncomeInflow(txs: Transaction[]): number {
  return sum(txs.filter(isNonIncomeInflow));
}

/** Borrowed and withdrawn split out, for labelling that line precisely. */
export function nonIncomeInflowBreakdown(txs: Transaction[]): {
  borrowed: number;
  withdrawn: number;
  total: number;
} {
  const borrowed = sum(
    txs.filter((t) => t.type === "income" && incomeSourceOf(t) === "borrowed"),
  );
  const withdrawn = sum(
    txs.filter((t) => t.type === "income" && incomeSourceOf(t) === "withdrawn"),
  );
  return { borrowed, withdrawn, total: borrowed + withdrawn };
}

/** Gifts this cycle, so the dashboard can say how much of income was given. */
export function sumGiftIncome(txs: Transaction[]): number {
  return sum(
    txs.filter((t) => t.type === "income" && incomeSourceOf(t) === "gift"),
  );
}

/**
 * Money held for others minus what was paid for them. Positive means you're
 * still holding someone's money; negative means you've topped it up yourself.
 */
export function heldForOthersBalance(txs: Transaction[]): {
  held: number;
  paid: number;
  left: number;
} {
  const held = sum(
    txs.filter((t) => t.type === "income" && incomeSourceOf(t) === "held"),
  );
  const paid = sum(txs.filter((t) => t.type === "expense" && t.forOthers));
  return { held, paid, left: held - paid };
}

export function incomeSourceMeta(source: IncomeSource) {
  return INCOME_SOURCES.find((s) => s.value === source) ?? INCOME_SOURCES[0];
}
