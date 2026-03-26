"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { ChevronRightIcon, ChevronLeftIcon } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

type TxType = "expense" | "income" | "transfer";

export default function NewTransactionPage() {
  const router = useRouter();
  const { accounts, categories, createTransaction, userProfile, loadingProfile, loadingAccounts } = useApp();

  const setupLoading = loadingProfile || loadingAccounts;
  const setupComplete = userProfile?.salaryDay != null && accounts.length > 0;

  if (!setupLoading && !setupComplete) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" type="button" onClick={() => router.back()}>
            <ChevronLeftIcon className="size-4" />
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
      if (l3Categories.length > 0 && !l3Id) return "Please select an item.";
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
      router.push("/transactions");
    } catch {
      toast.error("Failed to add transaction. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const CategoryDrillDown = () => (
    <div className="space-y-3">
      {/* L1 */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          Category
        </Label>
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
      </div>

      {/* L2 */}
      {l1Id && l2Categories.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Subcategory
          </Label>
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
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Item
          </Label>
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
          size="icon"
          type="button"
          onClick={() => router.back()}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">New Transaction</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Selector */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Type
          </Label>
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
          <Label>Date & Time</Label>
          <div className="rounded-xl border border-border overflow-hidden">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              disabled={{ after: new Date() }}
              className="w-full"
            />
            <div className="border-t border-border px-4 py-3 flex items-center gap-3">
              <Label htmlFor="time" className="text-sm shrink-0">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="space-y-1.5">
          <Label>Account</Label>
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
        </div>

        {/* To Account (Transfer only) */}
        {txType === "transfer" && (
          <div className="space-y-1.5">
            <Label>To Account</Label>
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
          </div>
        )}

        {/* Category (Expense only) */}
        {txType === "expense" && <CategoryDrillDown />}

        {/* Note */}
        <div className="space-y-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            type="text"
            placeholder="Add a note..."
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
