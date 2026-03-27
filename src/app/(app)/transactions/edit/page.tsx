"use client";

import { Suspense } from "react";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ChevronLeftIcon } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TxType = "expense" | "income" | "transfer";

function EditTransactionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const { accounts, categories, transactions, loadingTransactions, editTransaction } = useApp();

  const tx = useMemo(() => transactions.find((t) => t.id === id), [transactions, id]);

  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [note, setNote] = useState("");
  const [l1Id, setL1Id] = useState<string | null>(null);
  const [l2Id, setL2Id] = useState<string | null>(null);
  const [l3Id, setL3Id] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initialised, setInitialised] = useState(false);

  // Pre-fill form once tx is loaded
  useEffect(() => {
    if (!tx || initialised) return;

    setTxType(tx.type);
    setAmount(String(tx.amount));
    setSelectedDate(parseISO(tx.date));
    setTime(tx.time ?? format(new Date(), "HH:mm"));
    setAccountId(tx.accountId);
    setToAccountId(tx.toAccountId ?? "");
    setNote(tx.note ?? "");

    // Resolve category hierarchy
    if (tx.categoryId) {
      const cat = categories.find((c) => c.id === tx.categoryId);
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
  }, [tx, categories, initialised]);

  const l1Categories = useMemo(() => {
    const order: Record<string, number> = { needs: 0, wants: 1, savings: 2 };
    return categories
      .filter((c) => c.level === 1 && categories.some((s) => s.level === 2 && s.parentId === c.id))
      .sort((a, b) => (order[a.type ?? ""] ?? 9) - (order[b.type ?? ""] ?? 9));
  }, [categories]);

  const l2Categories = useMemo(
    () => l1Id
      ? categories.filter((c) => c.level === 2 && c.parentId === l1Id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      : [],
    [categories, l1Id]
  );

  const l3Categories = useMemo(
    () => l2Id
      ? categories.filter((c) => c.level === 3 && c.parentId === l2Id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      : [],
    [categories, l2Id]
  );

  const selectedCategoryId = l3Id ?? l2Id ?? l1Id ?? null;

  const handleSelectL1 = (id: string) => { setL1Id(id); setL2Id(null); setL3Id(null); };
  const handleSelectL2 = (id: string) => { setL2Id(id); setL3Id(null); };

  const date = format(selectedDate, "yyyy-MM-dd");

  const validate = (): string | null => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return "Please enter a valid amount.";
    if (!accountId) return "Please select an account.";
    if (txType === "transfer" && !toAccountId) return "Please select a destination account.";
    if (txType === "transfer" && accountId === toAccountId) return "Source and destination accounts must differ.";
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
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      await editTransaction(id, {
        type: txType,
        amount: parseFloat(amount),
        date,
        time,
        accountId,
        toAccountId: txType === "transfer" ? toAccountId : undefined,
        categoryId: txType === "expense" ? (selectedCategoryId ?? undefined) : undefined,
        note: note.trim() || undefined,
      });
      toast.success("Transaction updated.");
      router.push("/transactions");
    } catch {
      toast.error("Failed to update transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTransactions || !initialised) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground">Transaction not found.</p>
      </div>
    );
  }

  const pillClass = (active: boolean) =>
    cn("px-3 py-1.5 rounded-lg text-sm border transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
    );

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" type="button" onClick={() => router.back()}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">Edit Transaction</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Type</Label>
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(["expense", "income", "transfer"] as TxType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => { setTxType(type); setL1Id(null); setL2Id(null); setL3Id(null); }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium capitalize transition-colors",
                  txType === type ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
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
          <div className="rounded-xl border border-border">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              disabled={{ after: new Date() }}
              className="w-full pb-2"
            />
          </div>
          <div className="space-y-1.5 mt-4">
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
        <div className="space-y-1.5">
          <Label>Account</Label>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <button key={a.id} type="button" onClick={() => setAccountId(a.id)} className={pillClass(accountId === a.id)}>
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
              {accounts.filter((a) => a.id !== accountId).map((a) => (
                <button key={a.id} type="button" onClick={() => setToAccountId(a.id)} className={pillClass(toAccountId === a.id)}>
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category (Expense only) */}
        {txType === "expense" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
              <div className="flex flex-wrap gap-2">
                {l1Categories.map((cat) => (
                  <button key={cat.id} type="button" onClick={() => handleSelectL1(cat.id)} className={pillClass(l1Id === cat.id)}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            {l1Id && l2Categories.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Subcategory</Label>
                <div className="flex flex-wrap gap-2">
                  {l2Categories.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => handleSelectL2(cat.id)} className={pillClass(l2Id === cat.id)}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {l2Id && l3Categories.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Item</Label>
                <div className="flex flex-wrap gap-2">
                  {l3Categories.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => setL3Id(l3Id === cat.id ? null : cat.id)} className={pillClass(l3Id === cat.id)}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}

export default function EditTransactionPage() {
  return (
    <Suspense fallback={
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-12 w-full bg-muted rounded animate-pulse" />
        <div className="h-12 w-full bg-muted rounded animate-pulse" />
        <div className="h-64 w-full bg-muted rounded animate-pulse" />
      </div>
    }>
      <EditTransactionForm />
    </Suspense>
  );
}
