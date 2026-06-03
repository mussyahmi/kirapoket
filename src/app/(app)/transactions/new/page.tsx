"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { ChevronRightIcon, ArrowLeftIcon, TriangleAlertIcon } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

type TxType = "expense" | "income" | "transfer";

function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accounts, categories, createTransaction, userProfile, loadingProfile, loadingAccounts, loadingCategories, isViewingPartner, isImpersonating } = useApp();

  const isReadOnly = isViewingPartner || isImpersonating;
  const setupLoading = loadingProfile || loadingAccounts;
  const setupComplete = userProfile?.salaryDay != null && accounts.length > 0;

  if (isReadOnly) {
    router.replace("/transactions");
    return null;
  }

  if (!setupLoading && !setupComplete) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" type="button" className="h-8 w-8 p-0" onClick={() => router.back()}>
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-xl font-semibold">New Transaction</h1>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm font-medium">Complete setup first</p>
            <p className="text-sm text-muted-foreground">
              Before adding transactions, you need to:
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {userProfile?.salaryDay == null && (
                <li>
                  ·{" "}
                  <a href="/settings" className="underline text-foreground">
                    Set your salary day
                  </a>
                </li>
              )}
              {accounts.length === 0 && (
                <li>
                  ·{" "}
                  <a href="/accounts" className="underline text-foreground">
                    Add at least one account
                  </a>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Category drill-down state
  const [l1Id, setL1Id] = useState<string | null>(null);
  const [l2Id, setL2Id] = useState<string | null>(null);
  const [l3Id, setL3Id] = useState<string | null>(null);

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

  const renderBalanceHint = (accId: string, role: "source" | "dest") => {
    const acc = accounts.find((a) => a.id === accId);
    if (!acc) return null;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      await createTransaction({
        type: txType,
        amount: parseFloat(amount),
        date,
        time,
        accountId,
        toAccountId: txType === "transfer" ? toAccountId : undefined,
        categoryId:
          txType !== "transfer" ? (selectedCategoryId ?? undefined) : undefined,
        note: note.trim() || undefined,
      });
      toast.success("Transaction added.");
      router.push(searchParams.get("from") === "onboarding" ? "/home?onboarding=done" : "/transactions");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add transaction. Please try again.");
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="h-8 w-8 p-0"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">New Transaction</h1>
      </div>

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
          <div className="rounded-xl border border-border min-h-[450px]">
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

        <Button
          type="submit"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Add Transaction"}
        </Button>
      </form>
    </div>
  );
}

export default function NewTransactionPageWrapper() {
  return <Suspense><NewTransactionPage /></Suspense>;
}
