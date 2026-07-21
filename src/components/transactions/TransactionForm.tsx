"use client";

import { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ArrowLeftIcon, TriangleAlertIcon } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getSalaryCycleRange } from "@/lib/firestore";
import { computeBudgetImpact, type BudgetImpact } from "@/lib/budget";
import {
  TransactionConfirmDialog,
  type AccountImpact,
  type TxConfirmSummary,
} from "./TransactionConfirmDialog";

type TxType = "expense" | "income" | "transfer";

/**
 * The transaction form, reused by the bottom-sheet for both quick-add and edit.
 * Pass `editId` to edit an existing transaction; omit it to add a new one.
 * Navigation is delegated to onDone/onCancel so the caller decides whether to
 * route away or just close a sheet.
 */
export function TransactionForm({
  embedded = false,
  editId,
  onDone,
  onCancel,
  onConfirmOpenChange,
}: {
  embedded?: boolean;
  editId?: string;
  onDone: () => void;
  onCancel: () => void;
  // Lets a sheet host recede/lock its chrome while the confirm dialog is open
  onConfirmOpenChange?: (open: boolean) => void;
}) {
  const {
    accounts,
    categories,
    transactions,
    createTransaction,
    editTransaction,
    userProfile,
    loadingProfile,
    loadingAccounts,
    loadingCategories,
    loadingTransactions,
  } = useApp();

  const isEdit = !!editId;
  const editTx = useMemo(
    () => (editId ? transactions.find((t) => t.id === editId) : undefined),
    [transactions, editId]
  );

  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Snapshot of the account impacts taken when the confirm dialog opens. The
  // live `confirmImpacts` recomputes from account balances, which update
  // optimistically during save — reading them live would briefly show the
  // amount deducted twice before the dialog closes.
  const [frozenImpacts, setFrozenImpacts] = useState<AccountImpact[]>([]);
  const [frozenBudget, setFrozenBudget] = useState<BudgetImpact | null>(null);

  const confirmBeforeSaving = userProfile?.confirmBeforeSaving ?? true;

  // Category drill-down state
  const [l1Id, setL1Id] = useState<string | null>(null);
  const [l2Id, setL2Id] = useState<string | null>(null);
  const [l3Id, setL3Id] = useState<string | null>(null);

  // In edit mode, pre-fill the form once the transaction (and categories) load
  const [initialised, setInitialised] = useState(false);
  useEffect(() => {
    if (!isEdit || !editTx || initialised) return;
    setTxType(editTx.type);
    setAmount(String(editTx.amount));
    setSelectedDate(parseISO(editTx.date));
    setTime(editTx.time ?? format(new Date(), "HH:mm"));
    setAccountId(editTx.accountId);
    setToAccountId(editTx.toAccountId ?? "");
    setNote(editTx.note ?? "");
    if (editTx.categoryId) {
      const cat = categories.find((c) => c.id === editTx.categoryId);
      if (cat) {
        if (cat.level === 3) {
          setL3Id(cat.id);
          const l2 = categories.find((c) => c.id === cat.parentId);
          if (l2) {
            setL2Id(l2.id);
            const l1 = categories.find((c) => c.id === l2.parentId);
            if (l1) setL1Id(l1.id);
          }
        } else if (cat.level === 2) {
          setL2Id(cat.id);
          const l1 = categories.find((c) => c.id === cat.parentId);
          if (l1) setL1Id(l1.id);
        } else {
          setL1Id(cat.id);
        }
      }
    }
    setInitialised(true);
  }, [isEdit, editTx, categories, initialised]);

  // Report confirm-dialog open state up so a sheet host can blur/lock its chrome
  useEffect(() => {
    onConfirmOpenChange?.(confirmOpen);
  }, [confirmOpen, onConfirmOpenChange]);

  const l1Categories = useMemo(() => {
    const order: Record<string, number> = { needs: 0, wants: 1, savings: 2 };
    return categories
      .filter((c) => c.level === 1 && categories.some((s) => s.level === 2 && s.parentId === c.id))
      .sort((a, b) => (order[a.type ?? ""] ?? 9) - (order[b.type ?? ""] ?? 9));
  }, [categories]);

  const l2Categories = useMemo(
    () =>
      l1Id
        ? categories
            .filter((c) => c.level === 2 && c.parentId === l1Id)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        : [],
    [categories, l1Id]
  );

  const l3Categories = useMemo(
    () =>
      l2Id
        ? categories
            .filter((c) => c.level === 3 && c.parentId === l2Id)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        : [],
    [categories, l2Id]
  );

  const setupLoading = loadingProfile || loadingAccounts;
  const setupComplete = accounts.length > 0;

  const selectedCategoryId = l3Id ?? l2Id ?? l1Id ?? null;

  const handleSelectL1 = (id: string) => {
    setL1Id(id);
    setL2Id(null);
    setL3Id(null);
  };
  const handleSelectL2 = (id: string) => {
    setL2Id(id);
    setL3Id(null);
  };

  const date = format(selectedDate, "yyyy-MM-dd");

  const formatMoney = (n: number) => {
    const v = parseFloat(n.toFixed(2));
    return new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(v === 0 ? 0 : v);
  };

  // Edit mode: net per-account balance change if saved — revert the original
  // transaction's effect, then apply the edited one (mirrors editTransaction).
  const editBalanceChanges = useMemo(() => {
    const changes: Record<string, number> = {};
    if (!editTx) return changes;
    const amt = parseFloat(amount);
    if (isNaN(amt)) return changes;
    const apply = (
      t: { type: TxType; amount: number; accountId: string; toAccountId?: string },
      factor: 1 | -1
    ) => {
      if (t.type === "expense")
        changes[t.accountId] = (changes[t.accountId] ?? 0) + factor * t.amount;
      if (t.type === "income")
        changes[t.accountId] = (changes[t.accountId] ?? 0) - factor * t.amount;
      if (t.type === "transfer") {
        changes[t.accountId] = (changes[t.accountId] ?? 0) + factor * t.amount;
        if (t.toAccountId)
          changes[t.toAccountId] = (changes[t.toAccountId] ?? 0) - factor * t.amount;
      }
    };
    apply({ type: editTx.type, amount: editTx.amount, accountId: editTx.accountId, toAccountId: editTx.toAccountId }, 1);
    apply({ type: txType, amount: amt, accountId, toAccountId: txType === "transfer" ? toAccountId : undefined }, -1);
    return changes;
  }, [editTx, txType, amount, accountId, toAccountId]);

  const renderBalanceHint = (accId: string, role: "source" | "dest") => {
    const acc = accounts.find((a) => a.id === accId);
    if (!acc) return null;

    // Edit mode uses the net revert-then-apply delta with an "After saving" label
    if (isEdit) {
      const delta = editBalanceChanges[accId] ?? 0;
      const changed = delta !== 0;
      const projected = acc.balance + delta;
      const short = changed && projected < 0;
      return (
        <div
          className={cn(
            "mt-2.5 rounded-lg border px-3 py-2.5 text-sm",
            short ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/40"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{acc.name} balance</span>
            <span className="font-medium tabular-nums">{formatMoney(acc.balance)}</span>
          </div>
          {changed && (
            <div
              className={cn(
                "mt-1.5 flex items-center justify-between border-t pt-1.5",
                short ? "border-destructive/30" : "border-border/60"
              )}
            >
              <span className={cn("flex items-center gap-1", short ? "text-destructive" : "text-muted-foreground")}>
                {short && <TriangleAlertIcon className="size-3.5" />}
                After saving
              </span>
              <span className={cn("font-semibold tabular-nums", short && "text-destructive")}>
                {formatMoney(projected)}
              </span>
            </div>
          )}
          {short && (
            <p className="mt-1 text-xs text-destructive">
              Short by {formatMoney(Math.abs(projected))} — saving this change leaves this account negative.
            </p>
          )}
        </div>
      );
    }

    const amt = parseFloat(amount);
    const hasAmt = !isNaN(amt) && amt > 0;
    const sign =
      txType === "income"
        ? 1
        : txType === "transfer"
          ? role === "source"
            ? -1
            : 1
          : -1;
    const projected = acc.balance + (hasAmt ? sign * amt : 0);
    const short = hasAmt && sign < 0 && projected < 0;
    const verb =
      txType === "income"
        ? "After this income"
        : txType === "transfer"
          ? role === "source"
            ? "After transfer out"
            : "After transfer in"
          : "After this expense";

    return (
      <div
        className={cn(
          "mt-2.5 rounded-lg border px-3 py-2.5 text-sm",
          short
            ? "border-destructive/40 bg-destructive/5"
            : "border-border bg-muted/40"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{acc.name} balance</span>
          <span className="font-medium tabular-nums">
            {formatMoney(acc.balance)}
          </span>
        </div>
        {hasAmt && (
          <div
            className={cn(
              "mt-1.5 flex items-center justify-between border-t pt-1.5",
              short ? "border-destructive/30" : "border-border/60"
            )}
          >
            <span
              className={cn(
                "flex items-center gap-1",
                short ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {short && <TriangleAlertIcon className="size-3.5" />}
              {verb}
            </span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                short && "text-destructive"
              )}
            >
              {formatMoney(projected)}
            </span>
          </div>
        )}
        {short && (
          <p className="mt-1 text-xs text-destructive">
            Short by {formatMoney(Math.abs(projected))} — not enough in this
            account.
          </p>
        )}
      </div>
    );
  };

  const validate = (): string | null => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return "Please enter a valid amount.";
    if (!date) return "Please select a date.";
    if (!accountId) return "Please select an account.";
    if (txType === "transfer" && !toAccountId)
      return "Please select a destination account.";
    if (txType === "transfer" && accountId === toAccountId)
      return "Source and destination accounts must differ.";
    if (txType === "expense") {
      if (!l1Id) return "Please select a category.";
      if (l2Categories.length > 0 && !l2Id) return "Please select a subcategory.";
      if (l2Id && l3Categories.length === 0) return "This subcategory has no items. Please add items first.";
      if (l2Id && !l3Id) return "Please select an item.";
    }
    return null;
  };

  // Summary + per-account balance changes shown in the confirmation sheet
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";

  const confirmSummary = useMemo<TxConfirmSummary | null>(() => {
    const amt = parseFloat(amount);
    if (isNaN(amt)) return null;
    const path = [l1Id, l2Id, l3Id]
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(" › ");
    let timeLabel: string | undefined;
    try {
      if (time) timeLabel = format(parseISO(`2000-01-01T${time}`), "h:mm a");
    } catch { /* ignore */ }
    return {
      type: txType,
      amount: amt,
      dateLabel: format(selectedDate, "d MMM yyyy"),
      timeLabel,
      categoryPath: txType === "expense" ? path || undefined : undefined,
      fromAccount: accountName(accountId),
      toAccount: txType === "transfer" ? accountName(toAccountId) : undefined,
      note: note.trim() || undefined,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, txType, selectedDate, time, accountId, toAccountId, note, l1Id, l2Id, l3Id, categories, accounts]);

  const confirmImpacts = useMemo<AccountImpact[]>(() => {
    // Edit mode: derive from the net revert-then-apply delta per account
    if (isEdit) {
      return Object.entries(editBalanceChanges)
        .map(([accId, delta]) => {
          const acc = accounts.find((a) => a.id === accId);
          if (!acc) return null;
          return { id: acc.id, name: acc.name, current: acc.balance, projected: acc.balance + delta };
        })
        .filter((r): r is AccountImpact => r !== null);
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return [];
    const impact = (id: string, delta: number): AccountImpact | null => {
      const acc = accounts.find((a) => a.id === id);
      if (!acc) return null;
      return { id: acc.id, name: acc.name, current: acc.balance, projected: acc.balance + delta };
    };
    const rows: (AccountImpact | null)[] = [];
    if (txType === "expense") rows.push(impact(accountId, -amt));
    else if (txType === "income") rows.push(impact(accountId, amt));
    else if (txType === "transfer") {
      rows.push(impact(accountId, -amt));
      rows.push(impact(toAccountId, amt));
    }
    return rows.filter((r): r is AccountImpact => r !== null);
  }, [isEdit, editBalanceChanges, amount, txType, accountId, toAccountId, accounts]);

  const confirmBudget = useMemo<BudgetImpact | null>(() => {
    const amt = parseFloat(amount);
    if (txType !== "expense" || !selectedCategoryId || isNaN(amt) || amt <= 0) return null;
    // Fall back to the default cycle when no salary day is set (matches the
    // budget page's ?? 25) so budget impact still shows before setup.
    const salaryDay = userProfile?.salaryDay ?? 25;
    const { start, end } = getSalaryCycleRange(salaryDay, selectedDate, {
      cycleStarts: userProfile?.cycleStarts,
    });
    return computeBudgetImpact({
      categories,
      transactions,
      categoryId: selectedCategoryId,
      amount: amt,
      cycleStartStr: format(start, "yyyy-MM-dd"),
      cycleEndStr: format(end, "yyyy-MM-dd"),
      // In edit mode, don't count the transaction being edited toward the spend
      excludeTransactionId: editId,
    });
  }, [amount, txType, selectedCategoryId, selectedDate, categories, transactions, userProfile, editId]);

  const doSave = async () => {
    setSubmitting(true);
    try {
      const payload = {
        type: txType,
        amount: parseFloat(amount),
        date,
        time,
        accountId,
        toAccountId: txType === "transfer" ? toAccountId : undefined,
        categoryId:
          txType !== "transfer" ? (selectedCategoryId ?? undefined) : undefined,
        note: note.trim() || undefined,
      };
      if (isEdit && editId) {
        await editTransaction(editId, payload);
        toast.success("Transaction updated.");
      } else {
        await createTransaction(payload);
        toast.success("Transaction added.");
      }
      setConfirmOpen(false);
      onDone();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : isEdit
            ? "Failed to update transaction."
            : "Failed to add transaction. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (confirmBeforeSaving) {
      setFrozenImpacts(confirmImpacts);
      setFrozenBudget(confirmBudget);
      setConfirmOpen(true);
      return;
    }
    await doSave();
  };

  const PillSkeletons = ({ widths }: { widths: string[] }) => (
    <div className="flex flex-wrap gap-2">
      {widths.map((w, i) => (
        <Skeleton key={i} className={cn("h-8 rounded-lg", w)} />
      ))}
    </div>
  );

  const CategoryDrillDown = () => (
    <div className="space-y-5">
      {/* L1 */}
      <div>
        <Label className="mb-1.5 block">Category</Label>
        {loadingCategories ? (
          <PillSkeletons widths={["w-16", "w-16", "w-20"]} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {l1Categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectL1(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                  l1Id === cat.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                {cat.name}
              </button>
            ))}
            {l1Categories.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No categories. Add them in the Categories page.
              </p>
            )}
          </div>
        )}
      </div>

      {/* L2 */}
      {l1Id && l2Categories.length > 0 && (
        <div>
          <Label className="mb-1.5 block">Subcategory</Label>
          <div className="flex flex-wrap gap-2">
            {l2Categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectL2(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                  l2Id === cat.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* L3 */}
      {l2Id && l3Categories.length > 0 && (
        <div>
          <Label className="mb-1.5 block">Item</Label>
          <div className="flex flex-wrap gap-2">
            {l3Categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setL3Id(l3Id === cat.id ? null : cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                  l3Id === cat.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (!setupLoading && !setupComplete) {
    return (
      <div className={cn("space-y-4", !embedded && "p-4 md:p-6 max-w-lg mx-auto")}>
        {!embedded && (
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" type="button" className="h-8 w-8 p-0" onClick={onCancel}>
              <ArrowLeftIcon className="size-4" />
            </Button>
            <h1 className="text-xl font-semibold">New Transaction</h1>
          </div>
        )}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm font-medium">Add an account first</p>
            <p className="text-sm text-muted-foreground">
              You need at least one account to track transactions against.
            </p>
            <a href="/accounts" className="inline-block underline text-foreground text-sm">
              Add an account
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit mode: wait for the transaction to load, or report it missing
  if (isEdit && !editTx) {
    return (
      <div className={cn("space-y-3", !embedded && "p-4 md:p-6 max-w-lg mx-auto")}>
        {loadingTransactions ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Transaction not found.</p>
        )}
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "p-4 md:p-6 max-w-lg mx-auto"}>
      {!embedded && (
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-8 w-8 p-0"
            onClick={onCancel}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-xl font-semibold">New Transaction</h1>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Selector */}
        <div>
          <Label className="mb-1.5 block">Type</Label>
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(["expense", "income", "transfer"] as TxType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTxType(type);
                  setL1Id(null);
                  setL2Id(null);
                  setL3Id(null);
                }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium capitalize transition-colors",
                  txType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (MYR)</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^\d+(\.\d{0,2})?$/.test(val)) setAmount(val);
            }}
            required
          />
        </div>

        {/* Date & Time */}
        <div className="space-y-1.5">
          <Label>Date</Label>
          <div className="rounded-xl border border-border min-h-[450px] bg-background overflow-hidden">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              disabled={{ after: new Date() }}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5 mt-6">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Account */}
        <div>
          <Label className="mb-1.5 block">
            {txType === "transfer" ? "From Account" : "Account"}
          </Label>
          {loadingAccounts ? (
            <PillSkeletons widths={["w-20", "w-24", "w-20"]} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccountId(a.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                    accountId === a.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
          {accountId && renderBalanceHint(accountId, "source")}
        </div>

        {/* To Account (Transfer only) */}
        {txType === "transfer" && (
          <div>
            <Label className="mb-1.5 block">To Account</Label>
            <div className="flex flex-wrap gap-2">
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setToAccountId(a.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                      toAccountId === a.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    )}
                  >
                    {a.name}
                  </button>
                ))}
            </div>
            {toAccountId && renderBalanceHint(toAccountId, "dest")}
          </div>
        )}

        {/* Category (Expense only) */}
        {txType === "expense" && <CategoryDrillDown />}

        {/* Note */}
        <div className="space-y-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea
            id="note"
            placeholder="Add a note..."
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div
          className={cn(
            embedded &&
              "sticky bottom-0 -mx-4 border-t bg-popover px-4 pt-4 pb-4"
          )}
        >
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Transaction"}
          </Button>
        </div>
      </form>

      <TransactionConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        mode={isEdit ? "edit" : "add"}
        summary={confirmSummary}
        impacts={frozenImpacts}
        budget={frozenBudget}
        onConfirm={doSave}
        submitting={submitting}
      />
    </div>
  );
}
