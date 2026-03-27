"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { PlusIcon, TrashIcon, CheckIcon, RotateCcwIcon, PencilIcon } from "lucide-react";
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
}

const DEFAULT_FORM: DebtForm = {
  personName: "",
  amount: "",
  note: "",
  direction: "i_owe",
  date: format(new Date(), "yyyy-MM-dd"),
  dueDate: "",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("ms-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 2 }).format(n);

export default function DebtsPage() {
  const { debts, loadingDebts, createDebt, editDebt, removeDebt } = useApp();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Debt | null>(null);
  const [form, setForm] = useState<DebtForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showSettled, setShowSettled] = useState(false);

  const unsettled = useMemo(() => debts.filter((d) => !d.settled), [debts]);
  const settled = useMemo(() => debts.filter((d) => d.settled), [debts]);

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
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personName.trim()) { toast.error("Person name is required."); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount."); return; }

    setSaving(true);
    try {
      const payload = {
        personName: form.personName.trim(),
        amount,
        note: form.note.trim() || undefined,
        direction: form.direction,
        date: form.date,
        dueDate: form.dueDate || undefined,
        settled: editTarget?.settled ?? false,
        settledDate: editTarget?.settledDate,
      };
      if (editTarget) {
        await editDebt(editTarget.id, payload);
        toast.success("Debt updated.");
      } else {
        await createDebt(payload);
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

  const today = format(new Date(), "yyyy-MM-dd");

  const DebtCard = ({ debt }: { debt: Debt }) => {
    const isOverdue = !debt.settled && debt.dueDate && debt.dueDate < today;
    return (
      <div className={cn(
        "flex items-start gap-3 p-3 rounded-xl border",
        debt.settled ? "border-border bg-muted/30 opacity-60" : "border-border bg-card"
      )}>
        {/* Direction indicator */}
        <div className={cn(
          "shrink-0 mt-0.5 size-2.5 rounded-full",
          debt.direction === "i_owe" ? "bg-red-400" : "bg-green-400"
        )} />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{debt.personName}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
              debt.direction === "i_owe"
                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            )}>
              {debt.direction === "i_owe" ? "I owe" : "Owes me"}
            </span>
          </div>
          <p className={cn(
            "text-base font-bold tabular-nums",
            debt.direction === "i_owe" ? "text-red-500" : "text-green-600 dark:text-green-400"
          )}>
            {fmt(debt.amount)}
          </p>
          {debt.note && <p className="text-xs text-muted-foreground">{debt.note}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{format(parseISO(debt.date), "d MMM yyyy")}</span>
            {debt.dueDate && (
              <span className={cn(
                "text-[10px]",
                isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
              )}>
                {isOverdue ? "⚠ Overdue · " : "Due · "}{format(parseISO(debt.dueDate), "d MMM yyyy")}
              </span>
            )}
            {debt.settled && debt.settledDate && (
              <span className="text-[10px] text-muted-foreground">Settled · {format(parseISO(debt.settledDate), "d MMM yyyy")}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleSettle(debt)}
            className={cn(
              "size-7 rounded-lg flex items-center justify-center transition-colors",
              debt.settled
                ? "text-muted-foreground hover:bg-muted"
                : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            )}
            title={debt.settled ? "Mark unsettled" : "Mark settled"}
          >
            {debt.settled ? <RotateCcwIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => openEdit(debt)}
            className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <PencilIcon className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(debt)}
            className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <TrashIcon className="size-3.5" />
          </button>
        </div>
      </div>
    );
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
          {unsettled.map((d) => <DebtCard key={d.id} debt={d} />)}
        </div>
      )}

      {/* Settled section */}
      {settled.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowSettled((v) => !v)}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            {showSettled ? "Hide" : "Show"} settled ({settled.length})
          </button>
          {showSettled && (
            <div className="space-y-2">
              {settled.map((d) => <DebtCard key={d.id} debt={d} />)}
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-amount">Amount (MYR)</Label>
              <Input
                id="debt-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
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

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Debt</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete debt with <strong>{deleteTarget?.personName}</strong> for <strong>{deleteTarget ? fmt(deleteTarget.amount) : ""}</strong>?
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
