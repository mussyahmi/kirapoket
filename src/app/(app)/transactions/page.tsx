"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  PlusIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ArrowLeftRightIcon,
  TrashIcon,
  PencilIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

type FilterType = "all" | "expense" | "income" | "transfer";

export default function TransactionsPage() {
  const { transactions, accounts, categories, loadingTransactions, removeTransaction } =
    useApp();

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const resetVisible = () => setVisibleGroups(GROUPS_PAGE);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [visibleGroups, setVisibleGroups] = useState(10);
  const GROUPS_PAGE = 10;

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterAccount !== "all" && t.accountId !== filterAccount) return false;
      if (
        filterCategory !== "all" &&
        t.categoryId !== filterCategory
      )
        return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [transactions, filterType, filterAccount, filterCategory, dateFrom, dateTo]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const date = t.date;
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      b.localeCompare(a)
    );
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <Link href="/transactions/new">
          <Button size="sm" className="gap-1.5">
            <PlusIcon className="size-4" /> Add
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={filterType}
          onValueChange={(v) => { setFilterType((v ?? "all") as FilterType); resetVisible(); }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {{ all: "All types", expense: "Expense", income: "Income", transfer: "Transfer" }[filterType]}
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
          onValueChange={(v) => { setFilterAccount(v ?? "all"); resetVisible(); }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {filterAccount === "all" ? "All accounts" : accounts.find((a) => a.id === filterAccount)?.name ?? "Account"}
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

        <label className="flex h-8 items-center gap-1.5 border border-input rounded-lg px-2.5 bg-background">
          <span className="text-xs text-muted-foreground shrink-0">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetVisible(); }}
            className="text-sm bg-transparent outline-none w-full [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          />
        </label>
        <label className="flex h-8 items-center gap-1.5 border border-input rounded-lg px-2.5 bg-background">
          <span className="text-xs text-muted-foreground shrink-0">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetVisible(); }}
            className="text-sm bg-transparent outline-none w-full [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          />
        </label>
      </div>

      {/* List */}
      {loadingTransactions ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <p className="text-sm">No transactions found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.slice(0, visibleGroups).map(([date, txs]) => (
            <div key={date}>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {format(parseISO(date), "EEEE, d MMMM yyyy")}
              </p>
              <Card className="py-0">
                <CardContent className="divide-y divide-border p-0">
                  {txs.map((tx) => {
                    const account = accounts.find((a) => a.id === tx.accountId);
                    const category = tx.categoryId
                      ? categoryMap[tx.categoryId]
                      : null;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 px-4 py-3"
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
                            {tx.type === "income"
                              ? account?.name
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
                          {formatMoney(tx.amount, tx.type)}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <Link href={`/transactions/edit?id=${tx.id}`}>
                            <Button variant="ghost" size="icon-sm">
                              <PencilIcon className="size-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(tx)}
                          >
                            <TrashIcon className="size-3.5 text-destructive" />
                          </Button>
                        </div>
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
              className="w-full text-sm text-muted-foreground py-2 underline underline-offset-2"
            >
              Load more ({grouped.length - visibleGroups} more days)
            </button>
          )}
        </div>
      )}

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
              variant="destructive"
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
