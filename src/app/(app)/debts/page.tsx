"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  PlusIcon, TrashIcon, CheckIcon, RotateCcwIcon, PencilIcon,
  ChevronDownIcon, BanknoteIcon, HandCoinsIcon, MoreHorizontalIcon, ReceiptIcon,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Debt } from "@/lib/types";

type Direction = "i_owe" | "they_owe";

interface DebtForm {
  personName: string;
  amount: string;
  note: string;
  direction: Direction;
  date: string;
  dueDate: string;
  accountId: string;
}

const DEFAULT_FORM: DebtForm = {
  personName: "",
  amount: "",
  note: "",
  direction: "i_owe",
  date: format(new Date(), "yyyy-MM-dd"),
  dueDate: "",
  accountId: "",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("ms-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 2 }).format(n);

const today = format(new Date(), "yyyy-MM-dd");

interface DebtCardProps {
  debt: Debt;
  hidePersonName?: boolean;
  flat?: boolean;
  onSettle: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onPay?: (debt: Debt) => void;
  onCollect?: (debt: Debt) => void;
  onRecord?: (debt: Debt) => void;
}

function DebtCard({ debt, hidePersonName, flat, onSettle, onEdit, onDelete, onPay, onCollect, onRecord }: DebtCardProps) {
  const isOverdue = !debt.settled && debt.dueDate && debt.dueDate < today;
  const hasOriginal = debt.originalAmount != null && debt.originalAmount !== debt.amount;
  return (
    <div className={cn(
      "flex items-start gap-3 p-3",
      flat ? "" : "rounded-xl border",
      debt.settled
        ? flat ? "opacity-60" : "border-border bg-muted/30 opacity-60"
        : flat ? "" : "border-border bg-card"
    )}>
      <div className={cn(
        "shrink-0 mt-0.5 size-2.5 rounded-full",
        debt.direction === "i_owe" ? "bg-red-400" : "bg-green-400"
      )} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          {!hidePersonName && <span className="text-sm font-semibold truncate">{debt.personName}</span>}
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
            debt.direction === "i_owe"
              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          )}>
            {debt.direction === "i_owe" ? "I owe" : "Owes me"}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <p className={cn(
            "text-base font-bold tabular-nums",
            debt.direction === "i_owe" ? "text-red-500" : "text-green-600 dark:text-green-400"
          )}>
            {fmt(debt.amount)}
          </p>
          {hasOriginal && (
            <span className="text-[10px] text-muted-foreground tabular-nums line-through">
              {fmt(debt.originalAmount!)}
            </span>
          )}
        </div>
        {debt.note && <p className="text-xs text-muted-foreground">{debt.note}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">{format(parseISO(debt.date), "d MMM yyyy")}</span>
          {debt.dueDate && (
            <span className={cn("text-[10px]", isOverdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
              {isOverdue ? "⚠ Overdue · " : "Due · "}{format(parseISO(debt.dueDate), "d MMM yyyy")}
            </span>
          )}
          {debt.settled && debt.settledDate && (
            <span className="text-[10px] text-muted-foreground">Settled · {format(parseISO(debt.settledDate), "d MMM yyyy")}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!debt.settled && debt.direction === "i_owe" && onPay && (
          <button
            type="button"
            onClick={() => onPay(debt)}
            className="size-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Make payment"
          >
            <BanknoteIcon className="size-3.5" />
          </button>
        )}
        {!debt.settled && debt.direction === "they_owe" && onCollect && (
          <button
            type="button"
            onClick={() => onCollect(debt)}
            className="size-7 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            title="Collect payment"
          >
            <HandCoinsIcon className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onSettle(debt)}
          className={cn(
            "size-7 rounded-lg flex items-center justify-center transition-colors",
            debt.settled ? "text-muted-foreground hover:bg-muted" : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
          )}
          title={debt.settled ? "Mark unsettled" : "Mark settled"}
        >
          {debt.settled ? <RotateCcwIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            <MoreHorizontalIcon className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onEdit(debt)}>
              <PencilIcon className="size-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            {onRecord && !debt.transactionLinked && (
              <DropdownMenuItem onClick={() => onRecord(debt)}>
                <ReceiptIcon className="size-3.5 mr-2" /> Record transaction
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(debt)}
            >
              <TrashIcon className="size-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface DebtGroupCardProps {
  group: { key: string; displayName: string; debts: Debt[] };
  expandedGroups: Set<string>;
  onToggle: (key: string) => void;
  onSettle: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onPay: (debt: Debt) => void;
  onCollect: (debt: Debt) => void;
  onRecord: (debt: Debt) => void;
}

function DebtGroupCard({ group, expandedGroups, onToggle, onSettle, onEdit, onDelete, onPay, onCollect, onRecord }: DebtGroupCardProps) {
  const isExpanded = expandedGroups.has(group.key);
  const iOweTotal = group.debts.filter((d) => d.direction === "i_owe").reduce((s, d) => s + d.amount, 0);
  const theyOweTotal = group.debts.filter((d) => d.direction === "they_owe").reduce((s, d) => s + d.amount, 0);
  const allIOwe = iOweTotal > 0 && theyOweTotal === 0;
  const allTheyOwe = theyOweTotal > 0 && iOweTotal === 0;
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(group.key)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className={cn(
          "shrink-0 mt-0.5 size-2.5 rounded-full",
          allIOwe ? "bg-red-400" : allTheyOwe ? "bg-green-400" : "bg-yellow-400"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{group.displayName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
              {group.debts.length} entries
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {theyOweTotal > 0 && <span className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">{fmt(theyOweTotal)}</span>}
            {iOweTotal > 0 && <span className="text-sm font-bold text-red-500 tabular-nums">{fmt(iOweTotal)}</span>}
          </div>
        </div>
        <ChevronDownIcon className={cn("size-4 text-muted-foreground shrink-0 transition-transform duration-200", isExpanded && "rotate-180")} />
      </button>
      {isExpanded && (
        <div className="border-t border-border divide-y divide-border">
          {group.debts.map((d) => (
            <div key={d.id}>
              <DebtCard debt={d} hidePersonName flat onSettle={onSettle} onEdit={onEdit} onDelete={onDelete} onPay={onPay} onCollect={onCollect} onRecord={onRecord} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DebtsPage() {
  const { debts, loadingDebts, createDebt, editDebt, removeDebt, accounts, createTransaction, categories, createCategory } = useApp();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Debt | null>(null);
  const [form, setForm] = useState<DebtForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showSettled, setShowSettled] = useState(false);
  const [settledVisible, setSettledVisible] = useState(5);
  const SETTLED_PAGE = 5;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Pay / Collect dialog
  const [payTarget, setPayTarget] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
  const [paying, setPaying] = useState(false);

  // Record transaction dialog
  const [recordTarget, setRecordTarget] = useState<Debt | null>(null);
  const [recordAccountId, setRecordAccountId] = useState("");
  const [recording, setRecording] = useState(false);

  // Unique person names from all debts — shown as quick-select chips in the form
  const knownPersons = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const d of debts) {
      const key = d.personName.trim().toLowerCase();
      if (!seen.has(key)) { seen.add(key); names.push(d.personName.trim()); }
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [debts]);

  const unsettled = useMemo(
    () => debts.filter((d) => !d.settled).sort((a, b) => b.date.localeCompare(a.date)),
    [debts]
  );
  const settled = useMemo(
    () => debts.filter((d) => d.settled).sort((a, b) => b.date.localeCompare(a.date)),
    [debts]
  );

  const unsettledGroups = useMemo(() => {
    const map = new Map<string, Debt[]>();
    for (const d of unsettled) {
      const key = d.personName.trim().toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries())
      .map(([key, groupDebts]) => ({
        key,
        displayName: groupDebts[0].personName,
        debts: groupDebts.sort((a, b) => b.date.localeCompare(a.date)),
        latestDate: groupDebts[0].date,
      }))
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [unsettled]);

  const totalIOwe = useMemo(
    () => unsettled.filter((d) => d.direction === "i_owe").reduce((s, d) => s + d.amount, 0),
    [unsettled]
  );
  const totalOwedToMe = useMemo(
    () => unsettled.filter((d) => d.direction === "they_owe").reduce((s, d) => s + d.amount, 0),
    [unsettled]
  );

  const openCreate = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEdit = (debt: Debt) => {
    setEditTarget(debt);
    setForm({
      personName: debt.personName,
      amount: String(debt.amount),
      note: debt.note ?? "",
      direction: debt.direction,
      date: debt.date,
      dueDate: debt.dueDate ?? "",
      accountId: debt.accountId ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personName.trim()) { toast.error("Person name is required."); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0 || (!editTarget && amount <= 0)) { toast.error("Enter a valid amount."); return; }

    setSaving(true);
    try {
      const payload = {
        personName: form.personName.trim(),
        amount,
        originalAmount: editTarget?.originalAmount ?? amount,
        note: form.note.trim() || undefined,
        direction: form.direction,
        date: form.date,
        dueDate: form.dueDate || undefined,
        accountId: form.accountId || undefined,
        settled: editTarget?.settled ?? false,
        settledDate: editTarget?.settledDate,
      };
      if (editTarget) {
        await editDebt(editTarget.id, payload);
        toast.success("Debt updated.");
      } else {
        const newDebt = await createDebt(payload);
        // Optionally create a linked transaction if an account was selected
        if (form.accountId) {
          const personName = form.personName.trim();
          const txNote = form.note.trim() || undefined;
          if (form.direction === "i_owe") {
            // Borrowed money — goes INTO the account as income
            await createTransaction({
              type: "income",
              amount,
              date: form.date,
              time: format(new Date(), "HH:mm"),
              accountId: form.accountId,
              note: txNote,
            });
          } else {
            // Lent money — goes OUT OF the account as expense
            // Auto-find or create person as L3 under "Money Lent" (Savings)
            let categoryId: string | undefined;
            const moneyLentL2 = categories.find(
              (c) => c.level === 2 && c.name === "Money Lent"
            );
            if (moneyLentL2) {
              let personItem = categories.find(
                (c) => c.level === 3 && c.parentId === moneyLentL2.id && c.name === personName
              );
              if (!personItem) {
                personItem = await createCategory({
                  name: personName,
                  level: 3,
                  parentId: moneyLentL2.id,
                  type: "savings",
                  sortOrder: 99,
                });
              }
              categoryId = personItem.id;
            }
            await createTransaction({
              type: "expense",
              amount,
              date: form.date,
              time: format(new Date(), "HH:mm"),
              accountId: form.accountId,
              categoryId,
              note: txNote,
            });
          }
          await editDebt(newDebt.id, { transactionLinked: true });
        }
        toast.success("Debt added.");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleSettle = async (debt: Debt) => {
    try {
      if (debt.settled) {
        await editDebt(debt.id, { settled: false, settledDate: undefined });
        toast.success("Marked as unsettled.");
      } else {
        await editDebt(debt.id, { settled: true, settledDate: format(new Date(), "yyyy-MM-dd") });
        toast.success("Marked as settled!");
      }
    } catch {
      toast.error("Failed to update.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeDebt(deleteTarget.id);
      toast.success("Debt deleted.");
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const openPay = (debt: Debt) => {
    setPayTarget(debt);
    setPayAmount(String(debt.amount));
    setPayAccountId(debt.accountId ?? "");
  };

  const handlePayOrCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount."); return; }
    if (amt > payTarget.amount) { toast.error(`Cannot exceed remaining ${fmt(payTarget.amount)}.`); return; }
    if (!payAccountId) { toast.error("Please select an account."); return; }

    setPaying(true);
    try {
      const isIOwe = payTarget.direction === "i_owe";

      // Auto-categorize: Pay (I Owe) → Debt Repayment > person
      let categoryId: string | undefined;
      if (isIOwe) {
        const debtRepaymentL2 = categories.find(
          (c) => c.level === 2 && c.name === "Debt Repayment"
        );
        if (debtRepaymentL2) {
          let personItem = categories.find(
            (c) => c.level === 3 && c.parentId === debtRepaymentL2.id && c.name === payTarget.personName
          );
          if (!personItem) {
            personItem = await createCategory({
              name: payTarget.personName,
              level: 3,
              parentId: debtRepaymentL2.id,
              type: "needs",
              sortOrder: 99,
            });
          }
          categoryId = personItem.id;
        }
      }

      // Create transaction for this payment
      await createTransaction({
        type: isIOwe ? "expense" : "income",
        amount: amt,
        date: format(new Date(), "yyyy-MM-dd"),
        time: format(new Date(), "HH:mm"),
        accountId: payAccountId,
        categoryId,
        note: payTarget.note || (isIOwe
          ? `Payment to ${payTarget.personName}`
          : `Received from ${payTarget.personName}`),
      });

      // Reduce debt amount
      const remaining = parseFloat((payTarget.amount - amt).toFixed(2));
      if (remaining <= 0) {
        await editDebt(payTarget.id, {
          amount: 0,
          settled: true,
          settledDate: format(new Date(), "yyyy-MM-dd"),
        });
        toast.success(isIOwe ? "Fully paid — debt settled!" : "Fully collected — debt settled!");
      } else {
        await editDebt(payTarget.id, { amount: remaining });
        toast.success(
          isIOwe
            ? `Payment recorded. Remaining: ${fmt(remaining)}`
            : `Receipt recorded. Remaining: ${fmt(remaining)}`
        );
      }
      setPayTarget(null);
    } catch {
      toast.error("Failed to record payment.");
    } finally {
      setPaying(false);
    }
  };

  const isIOweDialog = payTarget?.direction === "i_owe";

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordTarget || !recordAccountId) { toast.error("Please select an account."); return; }
    setRecording(true);
    try {
      const isIOwe = recordTarget.direction === "i_owe";
      const amt = recordTarget.originalAmount ?? recordTarget.amount;
      const personName = recordTarget.personName;

      let categoryId: string | undefined;
      if (!isIOwe) {
        const moneyLentL2 = categories.find((c) => c.level === 2 && c.name === "Money Lent");
        if (moneyLentL2) {
          let personItem = categories.find(
            (c) => c.level === 3 && c.parentId === moneyLentL2.id && c.name === personName
          );
          if (!personItem) {
            personItem = await createCategory({ name: personName, level: 3, parentId: moneyLentL2.id, type: "savings", sortOrder: 99 });
          }
          categoryId = personItem.id;
        }
      }

      await createTransaction({
        type: isIOwe ? "income" : "expense",
        amount: amt,
        date: recordTarget.date,
        time: format(new Date(), "HH:mm"),
        accountId: recordAccountId,
        categoryId,
        note: recordTarget.note,
      });
      await editDebt(recordTarget.id, { transactionLinked: true });
      toast.success("Transaction recorded.");
      setRecordTarget(null);
    } catch {
      toast.error("Failed to record transaction.");
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Debts</h1>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <PlusIcon className="size-4" /> Add
        </Button>
      </div>

      {/* Summary */}
      {!loadingDebts && unsettled.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 space-y-0.5">
            <p className="text-xs text-muted-foreground">You owe</p>
            <p className="text-lg font-bold text-red-500 tabular-nums">{fmt(totalIOwe)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 space-y-0.5">
            <p className="text-xs text-muted-foreground">Owed to you</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">{fmt(totalOwedToMe)}</p>
          </div>
        </div>
      )}

      {/* Unsettled list */}
      {loadingDebts ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : unsettled.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2 text-muted-foreground">
          <p className="text-sm">No outstanding debts.</p>
          <p className="text-xs">Tap Add to track money you owe or are owed.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unsettledGroups.map((g) =>
            g.debts.length === 1
              ? <DebtCard key={g.debts[0].id} debt={g.debts[0]} onSettle={handleSettle} onEdit={openEdit} onDelete={setDeleteTarget} onPay={openPay} onCollect={openPay} onRecord={(d) => { setRecordTarget(d); setRecordAccountId(d.accountId ?? ""); }} />
              : <DebtGroupCard key={g.key} group={g} expandedGroups={expandedGroups} onToggle={handleToggleGroup} onSettle={handleSettle} onEdit={openEdit} onDelete={setDeleteTarget} onPay={openPay} onCollect={openPay} onRecord={(d) => { setRecordTarget(d); setRecordAccountId(d.accountId ?? ""); }} />
          )}
        </div>
      )}

      {/* Settled section */}
      {settled.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { setShowSettled((v) => !v); setSettledVisible(SETTLED_PAGE); }}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            {showSettled ? "Hide" : "Show"} settled ({settled.length})
          </button>
          {showSettled && (
            <div className="space-y-2">
              {settled.slice(0, settledVisible).map((d) => <DebtCard key={d.id} debt={d} onSettle={handleSettle} onEdit={openEdit} onDelete={setDeleteTarget} />)}
              {settledVisible < settled.length && (
                <button
                  type="button"
                  onClick={() => setSettledVisible((v) => v + SETTLED_PAGE)}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  Load more ({settled.length - settledVisible} remaining)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Debt" : "Add Debt"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Direction toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {([["i_owe", "I Owe"], ["they_owe", "They Owe Me"]] as [Direction, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, direction: val }))}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition-colors",
                    form.direction === val
                      ? val === "i_owe"
                        ? "bg-red-500 text-white"
                        : "bg-green-600 text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-person">Person</Label>
              <Input
                id="debt-person"
                placeholder="e.g. Ahmad, Mak Long"
                value={form.personName}
                onChange={(e) => setForm((f) => ({ ...f, personName: e.target.value }))}
                required
              />
              {knownPersons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {knownPersons.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, personName: name }))}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs border transition-colors",
                        form.personName === name
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-amount">Amount (MYR)</Label>
              <Input
                id="debt-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={editTarget ? "0" : "0.01"}
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
              {editTarget && editTarget.originalAmount != null && editTarget.originalAmount !== editTarget.amount && (
                <p className="text-[11px] text-muted-foreground">
                  Editing the remaining balance. Original amount was {fmt(editTarget.originalAmount)}.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="debt-date">Date</Label>
                <Input
                  id="debt-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="debt-due">Due date (optional)</Label>
                <div className="relative">
                  <Input
                    id="debt-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className={!form.dueDate ? "text-transparent" : ""}
                  />
                  {!form.dueDate && (
                    <span className="pointer-events-none absolute inset-0 flex items-center px-3 text-sm text-muted-foreground">
                      Select date
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Account linkage — only on create, not edit */}
            {!editTarget && accounts.length > 0 && (
              <div className="space-y-1.5">
                <Label>
                  {form.direction === "i_owe"
                    ? "Received into account (optional)"
                    : "Lent from account (optional)"}
                </Label>
                <p className="text-[11px] text-muted-foreground -mt-1">
                  {form.direction === "i_owe"
                    ? "Picks an account → records as income automatically"
                    : "Picks an account → records as expense automatically"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, accountId: f.accountId === a.id ? "" : a.id }))}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                        form.accountId === a.id
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

            <div className="space-y-1.5">
              <Label htmlFor="debt-note">Note (optional)</Label>
              <Input
                id="debt-note"
                placeholder="e.g. Dinner at Nando's"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editTarget ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay / Collect Dialog */}
      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isIOweDialog ? `Pay ${payTarget?.personName}` : `Collect from ${payTarget?.personName}`}
            </DialogTitle>
          </DialogHeader>
          {payTarget && (
            <form onSubmit={handlePayOrCollect} className="space-y-4">
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm flex justify-between">
                <span className="text-muted-foreground">Remaining balance</span>
                <span className={cn(
                  "font-bold tabular-nums",
                  isIOweDialog ? "text-red-500" : "text-green-600 dark:text-green-400"
                )}>
                  {fmt(payTarget.amount)}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">
                  {isIOweDialog ? "Amount to pay (MYR)" : "Amount received (MYR)"}
                </Label>
                <Input
                  id="pay-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  max={payTarget.amount}
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  {isIOweDialog ? "Pay from account" : "Receive into account"}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setPayAccountId(a.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                        payAccountId === a.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPayTarget(null)} disabled={paying}>
                  Cancel
                </Button>
                <Button type="submit" disabled={paying}>
                  {paying ? "Saving..." : isIOweDialog ? "Record Payment" : "Record Receipt"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Transaction Dialog */}
      <Dialog open={!!recordTarget} onOpenChange={(open) => !open && setRecordTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Transaction</DialogTitle>
          </DialogHeader>
          {recordTarget && (
            <form onSubmit={handleRecord} className="space-y-4">
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Person</span>
                  <span className="font-medium">{recordTarget.personName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className={cn("font-bold tabular-nums", recordTarget.direction === "i_owe" ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                    {fmt(recordTarget.originalAmount ?? recordTarget.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{recordTarget.direction === "i_owe" ? "Income (borrowed)" : "Expense (lent)"}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Account</Label>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setRecordAccountId(a.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                        recordAccountId === a.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRecordTarget(null)} disabled={recording}>
                  Cancel
                </Button>
                <Button type="submit" disabled={recording}>
                  {recording ? "Recording..." : "Record"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Debt</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete debt with <strong>{deleteTarget?.personName}</strong> for <strong>{deleteTarget ? fmt(deleteTarget.originalAmount ?? deleteTarget.amount) : ""}</strong>?
            {deleteTarget && deleteTarget.originalAmount != null && deleteTarget.originalAmount !== deleteTarget.amount && (
              <span className="block text-xs mt-1">{fmt(deleteTarget.amount)} remaining</span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
