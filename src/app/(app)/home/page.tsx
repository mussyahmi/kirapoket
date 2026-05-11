"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, addMonths, differenceInDays, parseISO, isToday, isYesterday } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, EyeOffIcon, ArrowUpRightIcon, ArrowDownRightIcon, ArrowLeftRightIcon, CheckCircle2Icon, CircleIcon, BanknoteIcon, PencilIcon, CheckIcon, XIcon, WalletIcon, ChevronDownIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { getSalaryCycleRange, deleteCycleStart } from "@/lib/firestore";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const L1_COLORS: Record<string, string> = {
  needs: "#4ade80",
  wants: "#f97316",
  savings: "#60a5fa",
};

const ACCOUNT_TYPE_DOT: Record<string, string> = {
  bank:    "#3b82f6",
  cash:    "#22c55e",
  ewallet: "#a855f7",
  credit:  "#f97316",
  savings: "#14b8a6",
  other:   "#94a3b8",
};

const ACCOUNTS_COLLAPSE = 4;

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    userProfile,
    accounts,
    categories,
    transactions,
    loadingTransactions,
    loadingAccounts,
    loadingProfile,
    saveUserProfile,
    isViewingPartner,
    isImpersonating,
  } = useApp();
  const isReadOnly = isViewingPartner || isImpersonating;

  const [cycleOffset, setCycleOffset] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = sessionStorage.getItem("home:cycleOffset");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [markingReceived, setMarkingReceived] = useState(false);
  const [editingStart, setEditingStart] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [onboardingDoneOpen, setOnboardingDoneOpen] = useState(() => searchParams.get("onboarding") === "done");

  const salaryDay = userProfile?.salaryDay ?? 25;
  const cycleStarts = userProfile?.cycleStarts;
  const hideBalance = userProfile?.hideBalance ?? false;

  const cycleOptions = { cycleStarts };

  // Determine reference date based on offset
  const referenceDate = useMemo(() => {
    const base = new Date();
    if (cycleOffset === 0) return base;
    const { start } = getSalaryCycleRange(salaryDay, base, cycleOptions);
    const shifted = addMonths(start, cycleOffset);
    return new Date(shifted.getFullYear(), shifted.getMonth(), salaryDay + 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleOffset, salaryDay, cycleStarts]);

  // Auto-computed cycle start key (without manual override) — used as the map key.
  const autoCycleStartKey = useMemo(() => {
    const { start } = getSalaryCycleRange(salaryDay, referenceDate);
    return format(start, "yyyy-MM-dd");
  }, [salaryDay, referenceDate]);

  const { start, end } = getSalaryCycleRange(salaryDay, referenceDate, cycleOptions);
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  const currentCycleManualStart = cycleStarts?.[autoCycleStartKey];

  // Near salary day on current cycle — show quick "Mark today" prompt.
  const nearSalaryDay = useMemo(() => {
    if (cycleOffset !== 0 || !userProfile?.salaryDay) return false;
    const today = new Date();
    const thisMonthSalaryDay = new Date(today.getFullYear(), today.getMonth(), salaryDay);
    return Math.abs(differenceInDays(today, thisMonthSalaryDay)) <= 3;
  }, [cycleOffset, salaryDay, userProfile?.salaryDay]);

  const handleMarkReceived = async () => {
    setMarkingReceived(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      await saveUserProfile({ cycleStarts: { ...cycleStarts, [autoCycleStartKey]: today } });
      toast.success("Cycle start updated.");
    } catch {
      toast.error("Failed to update.");
    } finally {
      setMarkingReceived(false);
    }
  };

  const handleSetDate = async () => {
    if (!editDate) return;
    setMarkingReceived(true);
    try {
      await saveUserProfile({ cycleStarts: { ...cycleStarts, [autoCycleStartKey]: editDate } });
      setEditingStart(false);
      toast.success("Cycle start updated.");
    } catch {
      toast.error("Failed to update.");
    } finally {
      setMarkingReceived(false);
    }
  };

  const handleClearManualStart = async () => {
    try {
      await deleteCycleStart(userProfile!.uid, autoCycleStartKey);
      setEditingStart(false);
    } catch {
      toast.error("Failed to reset.");
    }
  };

  const cycleLabel = `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;

  // Hide left chevron if no transactions exist before the current cycle's start
  const hasPrevCycle = useMemo(() => {
    return transactions.some((t) => t.date < startStr);
  }, [transactions, startStr]);

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

  const cycleBalance = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);

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

  const formatMoney = (n: number) => {
    if (hideBalance) return "••••";
    const v = parseFloat(n.toFixed(2));
    return new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(v === 0 ? 0 : v);
  };

  const loading = loadingTransactions || loadingAccounts || loadingProfile;

  const onboardingSteps = [
    {
      label: "Set your salary day",
      description: "So we know your spending cycle.",
      cta: "Go to Settings",
      done: userProfile?.salaryDay != null,
      href: "/settings?from=onboarding",
    },
    {
      label: "Add your first account",
      description: "Track your cash, bank, and e-wallet balances.",
      cta: "Add Account",
      done: accounts.length > 0,
      href: "/accounts?from=onboarding",
    },
    {
      label: "Record your first transaction",
      description: "Log an expense or income to start tracking.",
      cta: "Add Transaction",
      done: transactions.length > 0,
      href: "/transactions/new?from=onboarding",
    },
  ];

  const onboardingComplete = onboardingSteps.every((s) => s.done);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Onboarding Checklist */}
      {!loading && !onboardingComplete && (() => {
        const doneSteps = onboardingSteps.filter((s) => s.done);
        const activeStep = onboardingSteps.find((s) => !s.done)!;
        return (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Get started</CardTitle>
              <CardAction>
                <span className="text-xs text-muted-foreground font-medium">
                  {doneSteps.length} of {onboardingSteps.length} done
                </span>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-1 rounded-full bg-primary/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(doneSteps.length / onboardingSteps.length) * 100}%` }}
                />
              </div>
              {doneSteps.length > 0 && (
                <div className="space-y-1.5">
                  {doneSteps.map(({ label }) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2Icon className="size-3.5 text-primary shrink-0" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-lg bg-background border border-border p-3 space-y-3">
                <div className="flex items-start gap-2.5">
                  <CircleIcon className="size-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activeStep.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activeStep.description}</p>
                  </div>
                </div>
                <Button size="sm" className="w-full" asChild>
                  <Link href={activeStep.href}>{activeStep.cta}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Cycle Selector */}
      <div className="flex items-center justify-between">
        {hasPrevCycle ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setCycleOffset((o) => { const n = o - 1; sessionStorage.setItem("home:cycleOffset", String(n)); return n; }); setEditingStart(false); }}
            aria-label="Previous cycle"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
        ) : (
          <div className="size-9" />
        )}
        <div className="text-sm font-medium text-foreground">{cycleLabel}</div>
        {cycleOffset < 0 ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setCycleOffset((o) => { const n = o + 1; sessionStorage.setItem("home:cycleOffset", String(n)); return n; }); setEditingStart(false); }}
            aria-label="Next cycle"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        ) : (
          <div className="size-9" />
        )}
      </div>

      {/* Cycle start banner — hidden in read-only mode */}
      {!isReadOnly && userProfile?.salaryDay && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 pl-3 pr-4 py-2.5 border-l-2 border-l-primary">
          <BanknoteIcon className="size-4 text-primary shrink-0" />
          {editingStart ? (
            <>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-32 text-sm font-medium text-foreground bg-transparent outline-none border-b border-primary/40 focus:border-primary transition-colors [color-scheme:light] dark:[color-scheme:dark]"
              />
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleSetDate}
                disabled={markingReceived || !editDate}
                className="size-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                aria-label="Save"
              >
                <CheckIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditingStart(false)}
                className="size-6 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cancel"
              >
                <XIcon className="size-3.5" />
              </button>
            </>
          ) : currentCycleManualStart ? (
            <>
              <p className="flex-1 text-sm text-muted-foreground">
                Started on <span className="font-medium text-foreground">{format(new Date(currentCycleManualStart + "T00:00:00"), "d MMM yyyy")}</span>
              </p>
              <button
                type="button"
                onClick={() => { setEditDate(currentCycleManualStart); setEditingStart(true); }}
                className="size-7 rounded-lg hover:bg-muted flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Edit cycle start"
              >
                <PencilIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClearManualStart}
                className="size-7 rounded-lg hover:bg-muted flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Reset cycle start"
              >
                <XIcon className="size-3.5" />
              </button>
            </>
          ) : nearSalaryDay ? (
            <>
              <p className="flex-1 text-sm text-muted-foreground">Salary arrived early or late?</p>
              <button
                type="button"
                onClick={handleMarkReceived}
                disabled={markingReceived}
                className="text-xs font-medium text-primary shrink-0 disabled:opacity-40"
              >
                {markingReceived ? "Saving…" : "Mark today"}
              </button>
              <button
                type="button"
                onClick={() => { setEditDate(autoCycleStartKey); setEditingStart(true); }}
                className="size-7 rounded-lg hover:bg-muted flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Pick a date"
              >
                <PencilIcon className="size-3.5" />
              </button>
            </>
          ) : (
            <>
              <p className="flex-1 text-sm text-muted-foreground">Cycle start not recorded.</p>
              <button
                type="button"
                onClick={() => { setEditDate(autoCycleStartKey); setEditingStart(true); }}
                className="text-xs font-medium text-primary shrink-0"
              >
                Set date
              </button>
            </>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="px-0 py-4">
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                { label: "Income", value: totalIncome, color: "text-green-600 dark:text-green-400" },
                { label: "Expenses", value: totalExpenses, color: "text-red-600 dark:text-red-400" },
                { label: "Balance", value: cycleBalance, color: "text-blue-600 dark:text-blue-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center px-4 py-1 gap-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn("text-sm font-bold text-center tabular-nums", color)}>
                    {formatMoney(value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Balances — only shown for current cycle; balance is live and misleading for past cycles */}
      {cycleOffset < 0 ? null : loadingAccounts ? (
        <Skeleton className="h-28 rounded-xl" />
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardAction className="flex items-center gap-2">
            {hideBalance && <EyeOffIcon className="size-4 text-muted-foreground" />}
            <Link href="/accounts" aria-label="Manage accounts">
              <WalletIcon className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accounts yet.{" "}
              <Link href="/accounts" className="underline">
                Add one
              </Link>
              .
            </p>
          ) : (
            <>
              {(showAllAccounts ? accounts : accounts.slice(0, ACCOUNTS_COLLAPSE)).map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => router.push(`/transactions?account=${acc.id}`)}
                  className="flex items-center justify-between gap-2 w-full hover:opacity-70 transition-opacity"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: ACCOUNT_TYPE_DOT[acc.type] ?? "#94a3b8" }}
                    />
                    <span className="text-sm text-foreground truncate">{acc.name}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums shrink-0">
                    {formatMoney(acc.balance)}
                  </span>
                </button>
              ))}
              {accounts.length > ACCOUNTS_COLLAPSE && (
                <button
                  type="button"
                  onClick={() => setShowAllAccounts((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDownIcon className={cn("size-3.5 transition-transform", showAllAccounts && "rotate-180")} />
                  {showAllAccounts ? "Show less" : `${accounts.length - ACCOUNTS_COLLAPSE} more`}
                </button>
              )}
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-medium">Total</span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatMoney(totalBalance)}
                </span>
              </div>
            </>
          )}
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
            {pieData.length > 0 && (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} labelLine={false}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={L1_COLORS[entry.type] ?? `hsl(${index * 60}, 60%, 55%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => new Intl.NumberFormat("ms-MY", { style: "currency", currency: "MYR" }).format(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pb-2 border-b border-border">
                  {pieData.map((entry, index) => {
                    const total = pieData.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
                    const color = L1_COLORS[entry.type] ?? `hsl(${index * 60}, 60%, 55%)`;
                    return (
                      <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span>{entry.name} {pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
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
                    <button
                      type="button"
                      onClick={() => router.push(`/transactions?category=${l1.id}&from=${startStr}&to=${endStr}`)}
                      className="flex items-center gap-2 hover:underline text-left"
                    >
                      <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm font-bold">{l1.name}</span>
                    </button>
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
                              <button
                                type="button"
                                onClick={() => router.push(`/transactions?category=${l2.id}&from=${startStr}&to=${endStr}`)}
                                className="text-muted-foreground truncate hover:underline hover:text-foreground text-left"
                              >
                                {l2.name}
                              </button>
                              <span className="tabular-nums text-muted-foreground shrink-0">
                                {formatMoney(l2Spending[l2.id] ?? 0)}
                              </span>
                            </div>
                            {l3s.length > 0 && (
                              <div className="space-y-0.5 pl-3 border-l border-border/40">
                                {l3s.map((l3) => (
                                  <div key={l3.id} className="flex items-center justify-between text-xs gap-2">
                                    <button
                                      type="button"
                                      onClick={() => router.push(`/transactions?category=${l3.id}&from=${startStr}&to=${endStr}`)}
                                      className="text-muted-foreground/70 truncate hover:underline hover:text-muted-foreground text-left"
                                    >
                                      {l3.name}
                                    </button>
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
      {loadingTransactions ? (
        <Skeleton className="h-44 rounded-xl" />
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardAction>
            <Link
              href="/transactions"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              View all
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transactions yet.{" "}
              {!isReadOnly && (
                <Link href="/transactions/new" className="underline">Add one</Link>
              )}
              {!isReadOnly && "."}
            </p>
          ) : (() => {
            const groups: { label: string; txs: typeof recentTransactions }[] = [];
            for (const tx of recentTransactions) {
              const d = parseISO(tx.date);
              const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEEE, d MMM yyyy");
              const last = groups[groups.length - 1];
              if (last?.label === label) last.txs.push(tx);
              else groups.push({ label, txs: [tx] });
            }
            return groups.map(({ label, txs }) => (
              <div key={label}>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 mt-3 first:mt-0">{label}</p>
                <div className="space-y-0.5">
                  {txs.map((tx) => {
                    const account = accounts.find((a) => a.id === tx.accountId);
                    const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null;
                    const category = tx.categoryId ? categoryMap[tx.categoryId] : null;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 py-1.5">
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
                          ) : tx.type === "transfer" ? (
                            <ArrowLeftRightIcon className="size-4" />
                          ) : (
                            <ArrowUpRightIcon className="size-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {tx.type === "expense"
                              ? (category?.name ?? "Expense")
                              : tx.type === "income"
                              ? (tx.note ? tx.note.charAt(0).toUpperCase() + tx.note.slice(1) : "Income")
                              : "Transfer"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {tx.type === "transfer"
                              ? `${account?.name ?? "—"} → ${toAccount?.name ?? "—"}${tx.note ? ` · ${tx.note}` : ""}`
                              : `${account?.name}${tx.note ? ` · ${tx.note}` : ""}`}
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
                  })}
                </div>
              </div>
            ));
          })()}
        </CardContent>
      </Card>
      )}
      <Dialog open={onboardingDoneOpen} onOpenChange={setOnboardingDoneOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-3 py-2">
            <span className="text-4xl">🎉</span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">You&apos;re all set!</h2>
              <p className="text-sm text-muted-foreground">
                KiraPoket is ready. Start tracking your spending and take control of your finances.
              </p>
            </div>
            <Button className="w-full mt-2" onClick={() => {
              setOnboardingDoneOpen(false);
              router.replace("/home");
            }}>
              Let&apos;s go!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
