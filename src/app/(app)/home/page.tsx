"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, addMonths, differenceInDays } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, EyeOffIcon, ArrowUpRightIcon, ArrowDownRightIcon, CheckCircle2Icon, CircleIcon, BanknoteIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { getSalaryCycleRange } from "@/lib/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const L1_COLORS: Record<string, string> = {
  needs: "#4ade80",
  wants: "#f97316",
  savings: "#60a5fa",
};

export default function DashboardPage() {
  const {
    userProfile,
    accounts,
    categories,
    transactions,
    loadingTransactions,
    loadingAccounts,
    loadingProfile,
    saveUserProfile,
  } = useApp();

  const [cycleOffset, setCycleOffset] = useState(0);
  const [markingReceived, setMarkingReceived] = useState(false);

  const salaryDay = userProfile?.salaryDay ?? 25;
  const graceDays = userProfile?.salaryGraceDays ?? 0;
  const manualCycleStart = userProfile?.manualCycleStart;
  const hideBalance = userProfile?.hideBalance ?? false;

  const cycleOptions = { graceDays, manualCycleStart };

  // Determine reference date based on offset
  const referenceDate = useMemo(() => {
    const base = new Date();
    if (cycleOffset === 0) return base;
    const { start } = getSalaryCycleRange(salaryDay, base, cycleOptions);
    const shifted = addMonths(start, cycleOffset);
    return new Date(shifted.getFullYear(), shifted.getMonth(), salaryDay + 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleOffset, salaryDay, graceDays, manualCycleStart]);

  const { start, end } = getSalaryCycleRange(salaryDay, referenceDate, cycleOptions);

  // Show "salary received?" prompt when today is within salaryDay ± (graceDays + 3)
  // and we're viewing the current cycle.
  const showSalaryPrompt = useMemo(() => {
    if (cycleOffset !== 0 || !userProfile?.salaryDay) return false;
    const today = new Date();
    const thisMonthSalaryDay = new Date(today.getFullYear(), today.getMonth(), salaryDay);
    const diff = Math.abs(differenceInDays(today, thisMonthSalaryDay));
    return diff <= graceDays + 3;
  }, [cycleOffset, salaryDay, graceDays, userProfile?.salaryDay]);

  const handleMarkReceived = async () => {
    setMarkingReceived(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      await saveUserProfile({ manualCycleStart: today });
      toast.success("Cycle start updated.");
    } catch {
      toast.error("Failed to update.");
    } finally {
      setMarkingReceived(false);
    }
  };

  const handleClearManualStart = async () => {
    try {
      await saveUserProfile({ manualCycleStart: undefined });
    } catch {
      toast.error("Failed to reset.");
    }
  };

  const cycleLabel = `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;

  // Filter transactions within the current displayed cycle
  const cycleTransactions = useMemo(() => {
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    return transactions.filter(
      (t) => t.date >= startStr && t.date <= endStr
    );
  }, [transactions, start, end]);

  const totalIncome = useMemo(
    () =>
      cycleTransactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
    [cycleTransactions]
  );

  const totalExpenses = useMemo(
    () =>
      cycleTransactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [cycleTransactions]
  );

  const totalSavings = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);

  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + a.balance, 0),
    [accounts]
  );

  // Build L1 category spending
  const l1Categories = useMemo(
    () => {
      const order: Record<string, number> = { needs: 0, wants: 1, savings: 2 };
      return categories
        .filter((c) => c.level === 1)
        .sort((a, b) => (order[a.type ?? ""] ?? 9) - (order[b.type ?? ""] ?? 9));
    },
    [categories]
  );

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const l1Spending = useMemo(() => {
    const result: Record<string, number> = {};
    for (const t of cycleTransactions) {
      if (t.type !== "expense" || !t.categoryId) continue;
      let cat = categoryMap[t.categoryId];
      while (cat && cat.level !== 1 && cat.parentId) cat = categoryMap[cat.parentId];
      if (cat?.level === 1) result[cat.id] = (result[cat.id] ?? 0) + t.amount;
    }
    return result;
  }, [cycleTransactions, categoryMap]);

  const l2Spending = useMemo(() => {
    const result: Record<string, number> = {};
    for (const t of cycleTransactions) {
      if (t.type !== "expense" || !t.categoryId) continue;
      let cat = categoryMap[t.categoryId];
      while (cat && cat.level !== 2 && cat.parentId) cat = categoryMap[cat.parentId];
      if (cat?.level === 2) result[cat.id] = (result[cat.id] ?? 0) + t.amount;
    }
    return result;
  }, [cycleTransactions, categoryMap]);

  const l3Spending = useMemo(() => {
    const result: Record<string, number> = {};
    for (const t of cycleTransactions) {
      if (t.type !== "expense" || !t.categoryId) continue;
      const cat = categoryMap[t.categoryId];
      if (cat?.level === 3) result[cat.id] = (result[cat.id] ?? 0) + t.amount;
    }
    return result;
  }, [cycleTransactions, categoryMap]);


  const pieData = useMemo(
    () =>
      l1Categories
        .map((c) => ({ name: c.name, value: l1Spending[c.id] ?? 0, type: c.type ?? "" }))
        .filter((d) => d.value > 0),
    [l1Categories, l1Spending]
  );

  const recentTransactions = useMemo(
    () => [...transactions].slice(0, 5),
    [transactions]
  );

  const formatMoney = (n: number) =>
    hideBalance
      ? "••••"
      : new Intl.NumberFormat("ms-MY", {
          style: "currency",
          currency: "MYR",
          minimumFractionDigits: 2,
        }).format(n);

  const loading = loadingTransactions || loadingAccounts || loadingProfile;

  const onboardingSteps = [
    {
      label: "Set your salary day",
      done: userProfile?.salaryDay != null,
      href: "/settings",
    },
    {
      label: "Add your first account",
      done: accounts.length > 0,
      href: "/accounts",
    },
{
      label: "Record your first transaction",
      done: transactions.length > 0,
      href: "/transactions/new",
    },
  ];

  const onboardingComplete = onboardingSteps.every((s) => s.done);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Onboarding Checklist */}
      {!loading && !onboardingComplete && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Get started</CardTitle>
            <p className="text-xs text-muted-foreground">
              Complete these steps to set up KiraPoket.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {onboardingSteps.map(({ label, done, href }) => (
              <Link
                key={label}
                href={done ? "#" : href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  done
                    ? "opacity-50 cursor-default"
                    : "hover:bg-primary/10 cursor-pointer"
                )}
              >
                {done ? (
                  <CheckCircle2Icon className="size-4 text-primary shrink-0" />
                ) : (
                  <CircleIcon className="size-4 text-muted-foreground shrink-0" />
                )}
                <span className={cn(done && "line-through text-muted-foreground")}>
                  {label}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cycle Selector */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCycleOffset((o) => o - 1)}
          aria-label="Previous cycle"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <div className="text-sm font-medium text-foreground">{cycleLabel}</div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCycleOffset((o) => o + 1)}
          aria-label="Next cycle"
          disabled={cycleOffset >= 0}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      {/* Salary received prompt */}
      {showSalaryPrompt && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
          <BanknoteIcon className="size-4 text-muted-foreground shrink-0" />
          {manualCycleStart ? (
            <>
              <p className="flex-1 text-sm text-muted-foreground">
                Cycle started on <span className="font-medium text-foreground">{format(new Date(manualCycleStart + "T00:00:00"), "d MMM")}</span>.
              </p>
              <button
                type="button"
                onClick={handleClearManualStart}
                className="text-xs text-muted-foreground underline shrink-0"
              >
                Reset
              </button>
            </>
          ) : (
            <>
              <p className="flex-1 text-sm text-muted-foreground">Salary arrived early or late?</p>
              <button
                type="button"
                onClick={handleMarkReceived}
                disabled={markingReceived}
                className="text-xs font-medium text-primary shrink-0"
              >
                {markingReceived ? "Saving..." : "Mark today"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="px-0 py-3">
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                { label: "Income", value: totalIncome, color: "text-green-600 dark:text-green-400" },
                { label: "Expenses", value: totalExpenses, color: "text-red-600 dark:text-red-400" },
                { label: "Savings", value: totalSavings, color: "text-blue-600 dark:text-blue-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center px-3 py-1">
                  <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                  <p className={cn("text-sm font-semibold text-center leading-tight", color)}>
                    {formatMoney(value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          {hideBalance && <EyeOffIcon className="size-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingAccounts ? (
            <Skeleton className="h-16" />
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accounts yet.{" "}
              <Link href="/accounts" className="underline">
                Add one
              </Link>
              .
            </p>
          ) : (
            <>
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{acc.name}</span>
                  <span className="text-sm font-medium">
                    {formatMoney(acc.balance)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-medium">Total</span>
                <span className="text-sm font-semibold">
                  {formatMoney(totalBalance)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>


      {/* Pie Chart */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={L1_COLORS[entry.type] ?? `hsl(${index * 60}, 60%, 55%)`}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    new Intl.NumberFormat("ms-MY", {
                      style: "currency",
                      currency: "MYR",
                    }).format(Number(value))
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Spending by Category */}
      {l1Categories.length > 0 && totalExpenses > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {l1Categories.map((l1) => {
              const l1Spent = l1Spending[l1.id] ?? 0;
              if (l1Spent === 0) return null;

              const color = L1_COLORS[l1.type ?? ""] ?? "#94a3b8";
              const l2s = categories
                .filter((c) => c.level === 2 && c.parentId === l1.id)
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .filter((c) => (l2Spending[c.id] ?? 0) > 0);

              return (
                <div key={l1.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm font-bold">{l1.name}</span>
                    </div>
                    <span className="tabular-nums text-sm">{formatMoney(l1Spent)}</span>
                  </div>
                  {l2s.length > 0 && (
                    <div className="space-y-1.5 pl-4 border-l-2" style={{ borderColor: color + "66" }}>
                      {l2s.map((l2) => {
                        const l3s = categories
                          .filter((c) => c.level === 3 && c.parentId === l2.id)
                          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                          .filter((c) => (l3Spending[c.id] ?? 0) > 0);

                        return (
                          <div key={l2.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs gap-2">
                              <span className="text-muted-foreground truncate">{l2.name}</span>
                              <span className="tabular-nums text-muted-foreground shrink-0">
                                {formatMoney(l2Spending[l2.id] ?? 0)}
                              </span>
                            </div>
                            {l3s.length > 0 && (
                              <div className="space-y-0.5 pl-3 border-l border-border/40">
                                {l3s.map((l3) => (
                                  <div key={l3.id} className="flex items-center justify-between text-xs gap-2">
                                    <span className="text-muted-foreground/70 truncate">{l3.name}</span>
                                    <span className="tabular-nums text-muted-foreground/60 shrink-0">
                                      {formatMoney(l3Spending[l3.id] ?? 0)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Recent Transactions</CardTitle>
            <Link
              href="/transactions"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingTransactions ? (
            <Skeleton className="h-24" />
          ) : recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transactions yet.{" "}
              <Link href="/transactions/new" className="underline">
                Add one
              </Link>
              .
            </p>
          ) : (
            recentTransactions.map((tx) => {
              const account = accounts.find((a) => a.id === tx.accountId);
              const category = tx.categoryId
                ? categoryMap[tx.categoryId]
                : null;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 py-1.5"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center size-8 rounded-full shrink-0",
                      tx.type === "income"
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                        : tx.type === "transfer"
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                        : "bg-red-100 text-red-600 dark:bg-red-900/30"
                    )}
                  >
                    {tx.type === "income" ? (
                      <ArrowDownRightIcon className="size-4" />
                    ) : (
                      <ArrowUpRightIcon className="size-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {category?.name ?? tx.type}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {account?.name} · {tx.date}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold shrink-0",
                      tx.type === "income"
                        ? "text-green-600 dark:text-green-400"
                        : tx.type === "transfer"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {tx.type === "income" ? "+" : tx.type === "transfer" ? "" : "-"}
                    {formatMoney(tx.amount)}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
