"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { format, parseISO, isToday, isYesterday, subDays } from "date-fns";
import {
  PlusIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ArrowLeftRightIcon,
  TrashIcon,
  PencilIcon,
  XIcon,
  DownloadIcon,
  WalletIcon,
  TagIcon,
  StickyNoteIcon,
  ReceiptTextIcon,
  SearchXIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { useAddTransaction } from "@/components/transactions/AddTransactionSheet";
import { transactionsToCsv, downloadCsv } from "@/lib/csv";
import { getSalaryCycleRange } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RowSkeleton, LoadError } from "@/components/common/Skeletons";
import { cn } from "@/lib/utils";
import { l1Color } from "@/lib/palette";
import type { Transaction } from "@/lib/types";

type FilterType = "all" | "expense" | "income" | "transfer";

function TransactionsPage() {
  const {
    transactions,
    accounts,
    categories,
    userProfile,
    loadingProfile,
    loadingTransactions,
    removeTransaction,
    isViewingPartner,
    isImpersonating,
    loadError,
    refreshTransactions,
  } = useApp();
  const isReadOnly = isViewingPartner || isImpersonating;
  const { openAdd, openEdit } = useAddTransaction();

  const searchParams = useSearchParams();

  // No transactions at all is a different situation from no results for the
  // current filters — the toolbar is hidden entirely in the first case.
  const hasAnyTransactions = transactions.length > 0;

  const EDIT_RETURN_KEY = "txFilters:editReturn";

  const hasUrlParams =
    searchParams.get("account") !== null ||
    searchParams.get("category") !== null ||
    searchParams.get("from") !== null ||
    searchParams.get("to") !== null;

  // Read once and immediately clear — only relevant when returning from edit
  const editReturn = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(EDIT_RETURN_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(EDIT_RETURN_KEY);
      return JSON.parse(raw);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filterType, setFilterType] = useState<FilterType>(() => {
    if (hasUrlParams) return "all";
    return editReturn?.filterType ?? "all";
  });
  const [filterAccount, setFilterAccount] = useState<string>(() => {
    if (hasUrlParams) return searchParams.get("account") ?? "all";
    return editReturn?.filterAccount ?? "all";
  });
  const [filterCategory, setFilterCategory] = useState<string>(() => {
    if (hasUrlParams) return searchParams.get("category") ?? "all";
    return editReturn?.filterCategory ?? "all";
  });
  const [dateFrom, setDateFrom] = useState(() => {
    if (hasUrlParams) return searchParams.get("from") ?? "";
    return editReturn?.dateFrom ?? "";
  });
  const [dateTo, setDateTo] = useState(() => {
    if (hasUrlParams) return searchParams.get("to") ?? "";
    return editReturn?.dateTo ?? "";
  });

  // The current salary cycle — used as the default date range and the baseline
  // for deciding whether any filters are actually active.
  const defaultDates = useMemo(() => {
    const salaryDay = userProfile?.salaryDay ?? 25;
    const { start, end } = getSalaryCycleRange(salaryDay, new Date(), {
      cycleStarts: userProfile?.cycleStarts,
    });
    return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.salaryDay, userProfile?.cycleStarts]);

  // The last few salary cycles, so picking "last cycle" is one tap instead of
  // two date pickers.
  //
  // Stepping back one day from a cycle's start is not enough to leave that
  // cycle: a manual cycleStarts override can push the start up to a week PAST
  // the auto salary-day boundary, so start-1 still resolves to the same cycle
  // and the walk stalls, repeating one range forever. Keep stepping back until
  // the range actually changes.
  const CYCLE_CHOICES = 6;
  const cyclePresets = useMemo(() => {
    const salaryDay = userProfile?.salaryDay ?? 25;
    const opts = { cycleStarts: userProfile?.cycleStarts };
    const out: { key: string; label: string; from: string; to: string }[] = [];
    let ref = new Date();
    for (let i = 0; i < CYCLE_CHOICES; i++) {
      const { start, end } = getSalaryCycleRange(salaryDay, ref, opts);
      const from = format(start, "yyyy-MM-dd");
      out.push({
        key: `cycle-${i}`,
        label:
          i === 0
            ? "This cycle"
            : i === 1
              ? "Last cycle"
              : `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`,
        from,
        to: format(end, "yyyy-MM-dd"),
      });
      // No cycle is longer than ~5 weeks, so 45 days is a safe upper bound.
      let prev = subDays(start, 1);
      let guard = 0;
      while (
        guard < 45 &&
        format(getSalaryCycleRange(salaryDay, prev, opts).start, "yyyy-MM-dd") ===
          from
      ) {
        prev = subDays(prev, 1);
        guard++;
      }
      // Couldn't reach an earlier cycle — stop rather than list a duplicate.
      if (guard >= 45) break;
      ref = prev;
    }
    return out;
  }, [userProfile?.salaryDay, userProfile?.cycleStarts]);

  // Default the date range to the current salary cycle once the profile loads,
  // unless filters came from the URL or were restored after an edit.
  const didDefaultDates = useRef(false);
  const [dateInitDone, setDateInitDone] = useState(false);
  useEffect(() => {
    if (didDefaultDates.current) return;
    if (hasUrlParams || editReturn?.dateFrom || editReturn?.dateTo) {
      didDefaultDates.current = true;
      setDateInitDone(true);
      return;
    }
    if (loadingProfile) return;
    didDefaultDates.current = true;
    setDateFrom(defaultDates.from);
    setDateTo(defaultDates.to);
    setDateInitDone(true);
  }, [loadingProfile, hasUrlParams, editReturn, defaultDates]);

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const GROUPS_PAGE = 10;
  const [visibleGroups, setVisibleGroups] = useState(GROUPS_PAGE);
  const resetVisible = () => setVisibleGroups(GROUPS_PAGE);

  // The default cycle range is not considered an"active" filter — only show
  // Clear filters when something differs from the default state. Treat the
  // pre-init state as default too, so the button doesn't flash on first load.
  const datesAtDefault =
    !dateInitDone ||
    (dateFrom === defaultDates.from && dateTo === defaultDates.to);
  const hasActiveFilters =
    filterType !== "all" ||
    filterAccount !== "all" ||
    filterCategory !== "all" ||
    !datesAtDefault;

  const clearFilters = () => {
    setFilterType("all");
    setFilterAccount("all");
    setFilterCategory("all");
    setDateFrom(defaultDates.from);
    setDateTo(defaultDates.to);
    resetVisible();
    try {
      sessionStorage.removeItem(EDIT_RETURN_KEY);
    } catch {
      /* ignore */
    }
  };

  // The period select is derived from the dates rather than held in its own
  // state, so editing From/To by hand correctly falls back to "Custom range".
  const periodValue = useMemo(() => {
    if (!dateInitDone) return "cycle-0";
    if (!dateFrom && !dateTo) return "all";
    const hit = cyclePresets.find(
      (p) => p.from === dateFrom && p.to === dateTo,
    );
    return hit ? hit.key : "custom";
  }, [dateInitDone, dateFrom, dateTo, cyclePresets]);

  const periodLabel =
    periodValue === "all"
      ? "All time"
      : periodValue === "custom"
        ? "Custom range"
        : (cyclePresets.find((p) => p.key === periodValue)?.label ?? "Period");

  const applyPeriod = (v: string | null) => {
    const val = v ?? "cycle-0";
    if (val === "custom") return; // already showing the user's own dates
    if (val === "all") {
      setDateFrom("");
      setDateTo("");
    } else {
      const p = cyclePresets.find((x) => x.key === val);
      if (!p) return;
      setDateFrom(p.from);
      setDateTo(p.to);
    }
    resetVisible();
  };

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  // Build a set of matching categoryIds for the category filter
  const matchingCategoryIds = useMemo(() => {
    if (filterCategory === "all") return null;
    const cat = categoryMap[filterCategory];
    if (!cat) return new Set<string>();
    if (cat.level === 2) {
      // Include the L2 itself and all its L3 children
      const ids = new Set<string>([cat.id]);
      for (const c of categories) {
        if (c.level === 3 && c.parentId === cat.id) ids.add(c.id);
      }
      return ids;
    }
    return new Set([cat.id]);
  }, [filterCategory, categoryMap, categories]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (
        filterAccount !== "all" &&
        t.accountId !== filterAccount &&
        t.toAccountId !== filterAccount
      )
        return false;
      if (matchingCategoryIds !== null) {
        if (!t.categoryId || !matchingCategoryIds.has(t.categoryId))
          return false;
      }
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [
    transactions,
    filterType,
    filterAccount,
    matchingCategoryIds,
    dateFrom,
    dateTo,
  ]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const date = t.date;
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeTransaction(deleteTarget.id);
      toast.success("Transaction deleted.");
    } catch {
      toast.error("Failed to delete transaction.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleExport = () => {
    const csv = transactionsToCsv(filtered, accounts, categories);
    const today = format(new Date(), "yyyy-MM-dd");
    const rangeSuffix =
      dateFrom && dateTo
        ? `${dateFrom}_to_${dateTo}`
        : dateFrom
          ? `from-${dateFrom}`
          : dateTo
            ? `until-${dateTo}`
            : today;
    downloadCsv(`kirapoket-transactions-${rangeSuffix}.csv`, csv);
  };

  const formatMoney = (n: number, type: string) => {
    const formatted = new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(n);
    if (type === "income") return `+${formatted}`;
    if (type === "expense") return `-${formatted}`;
    return formatted;
  };

  return (
    <div className="p-4 md:p-6 max-w-content mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <div className="flex items-center gap-2 sm:gap-2">
          {hasAnyTransactions && hasActiveFilters && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={clearFilters}
              aria-label="Clear filters"
            >
              <XIcon />
              <span className="hidden sm:inline">Clear filters</span>
            </Button>
          )}
          {hasAnyTransactions && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleExport}
              disabled={filtered.length === 0}
              aria-label="Export"
            >
              <DownloadIcon />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
          {/* When the list is empty the empty state owns the primary action */}
          {!isReadOnly && hasAnyTransactions && (
            <Button size="sm" className="gap-2" onClick={openAdd}>
              <PlusIcon /> Add
            </Button>
          )}
        </div>
      </div>

      {/* Filters — hidden until there is something to filter */}
      {hasAnyTransactions && (
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={filterType}
            onValueChange={(v) => {
              setFilterType((v ?? "all") as FilterType);
              resetVisible();
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {
                  {
                    all: "All types",
                    expense: "Expense",
                    income: "Income",
                    transfer: "Transfer",
                  }[filterType]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterAccount}
            onValueChange={(v) => {
              setFilterAccount(v ?? "all");
              resetVisible();
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {filterAccount === "all"
                  ? "All accounts"
                  : (accounts.find((a) => a.id === filterAccount)?.name ??
                    "Account")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category filter — full width */}
          {(() => {
            const l1Cats = categories
              .filter((c) => c.level === 1)
              .sort((a, b) => {
                const order: Record<string, number> = {
                  needs: 0,
                  wants: 1,
                  savings: 2,
                };
                return (order[a.type ?? ""] ?? 9) - (order[b.type ?? ""] ?? 9);
              });
            const selectedCat =
              filterCategory !== "all" ? categoryMap[filterCategory] : null;
            return (
              <Select
                value={filterCategory}
                onValueChange={(v) => {
                  setFilterCategory(v ?? "all");
                  resetVisible();
                }}
              >
                <SelectTrigger className="w-full col-span-2">
                  <SelectValue>
                    {selectedCat ? selectedCat.name : "All categories"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {/* §8 — a dropdown is just a floating box: it can carry the
                      same Needs/Wants/Savings grouping the rest of the app
                      uses. This previously flattened all three roots away and
                      faked depth with a "·" prefix. */}
                  {l1Cats.map((l1) => {
                    const l2s = categories
                      .filter((c) => c.level === 2 && c.parentId === l1.id)
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                    if (l2s.length === 0) return null;
                    return (
                      <SelectGroup key={l1.id}>
                        <SelectSeparator />
                        <SelectLabel className="flex items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: l1Color(l1.type) }}
                          />
                          {l1.name}
                        </SelectLabel>
                        {l2s.map((l2) => {
                          const l3s = categories
                            .filter(
                              (c) => c.level === 3 && c.parentId === l2.id,
                            )
                            .sort(
                              (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
                            );
                          return [
                            <SelectItem key={l2.id} value={l2.id}>
                              {l2.name}
                            </SelectItem>,
                            ...l3s.map((l3) => (
                              <SelectItem
                                key={l3.id}
                                value={l3.id}
                                className="pl-8 text-muted-foreground"
                              >
                                {l3.name}
                              </SelectItem>
                            )),
                          ];
                        })}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            );
          })()}

          {/* Period presets — the common cases (this cycle, last cycle) are one
              tap; From/To below stay for anything else. */}
          <Select value={periodValue} onValueChange={applyPeriod}>
            <SelectTrigger className="w-full col-span-2">
              <SelectValue>{periodLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {cyclePresets.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value="all">All time</SelectItem>
              {/* Only reachable by editing the dates by hand, but the trigger
                  needs a matching item to render against. */}
              {periodValue === "custom" && (
                <SelectItem value="custom">Custom range</SelectItem>
              )}
            </SelectContent>
          </Select>

          <label className="flex h-8 pointer-coarse:h-11 items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <span className="text-xs text-muted-foreground shrink-0">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                resetVisible();
              }}
              className="text-sm pointer-coarse:text-base bg-transparent outline-none w-full [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </label>
          <label className="flex h-8 pointer-coarse:h-11 items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <span className="text-xs text-muted-foreground shrink-0">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                resetVisible();
              }}
              className="text-sm pointer-coarse:text-base bg-transparent outline-none w-full [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </label>
        </div>
      )}

      {/* List */}
      {loadingTransactions ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : loadError.transactions ? (
        <LoadError what="transactions" onRetry={refreshTransactions} />
      ) : grouped.length === 0 ? (
        !hasAnyTransactions ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <ReceiptTextIcon className="size-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">No transactions yet</p>
              <p className="mx-auto max-w-[32ch] text-sm text-muted-foreground">
                Log your first expense or income and it will show up here,
                grouped by day.
              </p>
            </div>
            {!isReadOnly && (
              <Button className="gap-2" onClick={openAdd}>
                <PlusIcon /> Add your first transaction
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <SearchXIcon className="size-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">
                Nothing matches these filters
              </p>
              <p className="mx-auto max-w-[32ch] text-sm text-muted-foreground">
                Try widening the date range or clearing a filter.
              </p>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={clearFilters}
              >
                <XIcon /> Clear filters
              </Button>
            )}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {grouped.slice(0, visibleGroups).map(([date, txs]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {isToday(parseISO(date))
                    ? "Today"
                    : isYesterday(parseISO(date))
                      ? "Yesterday"
                      : format(parseISO(date), "EEEE, d MMMM yyyy")}
                </p>
                {(() => {
                  const net = txs.reduce((sum, t) => {
                    if (t.type === "income") return sum + t.amount;
                    if (t.type === "expense") return sum - t.amount;
                    return sum;
                  }, 0);
                  const formatted = new Intl.NumberFormat("ms-MY", {
                    style: "currency",
                    currency: "MYR",
                    minimumFractionDigits: 2,
                  }).format(Math.abs(net));
                  return (
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        net > 0
                          ? "text-success"
                          : net < 0
                            ? "text-danger"
                            : "text-muted-foreground",
                      )}
                    >
                      {net > 0 ? "+" : net < 0 ? "-" : ""}
                      {formatted}
                    </p>
                  );
                })()}
              </div>
              <Card className="py-0">
                <CardContent className="divide-y divide-border p-0">
                  {txs.map((tx) => {
                    const account = accounts.find((a) => a.id === tx.accountId);
                    const toAccount = tx.toAccountId
                      ? accounts.find((a) => a.id === tx.toAccountId)
                      : null;
                    const category = tx.categoryId
                      ? categoryMap[tx.categoryId]
                      : null;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedTx(tx)}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center size-8 rounded-full shrink-0",
                            tx.type === "income"
                              ? "bg-success-soft text-success-strong"
                              : tx.type === "transfer"
                                ? "bg-info-soft text-info-strong"
                                : "bg-danger-soft text-danger-strong",
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
                                ? tx.note
                                  ? tx.note.charAt(0).toUpperCase() +
                                    tx.note.slice(1)
                                  : "Income"
                                : "Transfer"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {tx.type === "transfer"
                              ? `${account?.name ?? "—"} → ${toAccount?.name ?? "—"}${tx.note ? ` · ${tx.note}` : ""}`
                              : tx.type === "income"
                                ? account?.name
                                : `${account?.name}${tx.note ? ` · ${tx.note}` : ""}`}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold shrink-0",
                            tx.type === "income"
                              ? "text-success"
                              : tx.type === "transfer"
                                ? "text-info"
                                : "text-danger",
                          )}
                        >
                          {formatMoney(tx.amount, tx.type)}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
          {visibleGroups < grouped.length && (
            <button
              type="button"
              onClick={() => setVisibleGroups((v) => v + GROUPS_PAGE)}
              className="w-full text-sm text-muted-foreground py-2 link-underline"
            >
              Load more ({grouped.length - visibleGroups} more days)
            </button>
          )}
        </div>
      )}

      {/* Transaction Detail Dialog */}
      {(() => {
        const tx = selectedTx;
        if (!tx) return null;
        const account = accounts.find((a) => a.id === tx.accountId);
        const toAccount = tx.toAccountId
          ? accounts.find((a) => a.id === tx.toAccountId)
          : null;
        const category = tx.categoryId ? categoryMap[tx.categoryId] : null;
        const subcategory = category?.parentId
          ? categoryMap[category.parentId]
          : null;
        const TypeIcon =
          tx.type === "income"
            ? ArrowDownRightIcon
            : tx.type === "transfer"
              ? ArrowLeftRightIcon
              : ArrowUpRightIcon;
        const iconBg =
          tx.type === "income"
            ? "bg-success-soft"
            : tx.type === "transfer"
              ? "bg-info-soft"
              : "bg-danger-soft";
        const iconColor =
          tx.type === "income"
            ? "text-success"
            : tx.type === "transfer"
              ? "text-info"
              : "text-danger";
        const title =
          tx.type === "expense"
            ? (category?.name ?? "Expense")
            : tx.type === "income"
              ? tx.note
                ? tx.note.charAt(0).toUpperCase() + tx.note.slice(1)
                : "Income"
              : "Transfer";
        return (
          <Dialog
            open={!!selectedTx}
            onOpenChange={(open) => !open && setSelectedTx(null)}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center size-8 rounded-lg shrink-0",
                      iconBg,
                    )}
                  >
                    <TypeIcon className={cn("size-4", iconColor)} />
                  </div>
                  {title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {/* #13 — §2: labels are a last resort. The amount needs no
                    "AMOUNT" caption, a formatted date needs no "Date", and an
                    account name sits under an account-coloured icon. Folding
                    them away lets the figure own the dialog. */}
                <div className={cn("rounded-lg px-4 py-4 text-center", iconBg)}>
                  <p
                    className={cn(
                      "text-3xl leading-none font-bold tabular-nums",
                      iconColor,
                    )}
                  >
                    {formatMoney(tx.amount, tx.type)}
                  </p>
                </div>
                <div className="space-y-3 px-0.5 text-sm">
                  <p>
                    {format(parseISO(tx.date), "d MMMM yyyy")}
                    {tx.time
                      ? ` at ${format(parseISO(`2000-01-01T${tx.time}`), "h:mm a")}`
                      : ""}
                  </p>
                  <p className="flex items-center gap-2">
                    <WalletIcon className="size-4 shrink-0 text-muted-foreground" />
                    {tx.type === "transfer" ? (
                      <span>
                        {account?.name ?? "—"} → {toAccount?.name ?? "—"}
                      </span>
                    ) : (
                      <span>{account?.name ?? "—"}</span>
                    )}
                  </p>
                  {subcategory && (
                    <p className="flex items-center gap-2">
                      <TagIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span>
                        {subcategory.name}
                        {category && category.id !== subcategory.id
                          ? ` › ${category.name}`
                          : ""}
                      </span>
                    </p>
                  )}
                  {tx.note && tx.type !== "income" && (
                    <p className="flex items-start gap-2">
                      <StickyNoteIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="whitespace-pre-wrap text-muted-foreground">
                        {tx.note}
                      </span>
                    </p>
                  )}
                </div>
                {!isReadOnly && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      className="flex-1 w-full gap-2"
                      onClick={() => {
                        setSelectedTx(null);
                        openEdit(tx.id);
                      }}
                    >
                      <PencilIcon /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => {
                        setSelectedTx(null);
                        setDeleteTarget(tx);
                      }}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this transaction? This cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive-solid"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TransactionsPageWrapper() {
  return (
    <Suspense>
      <TransactionsPage />
    </Suspense>
  );
}
