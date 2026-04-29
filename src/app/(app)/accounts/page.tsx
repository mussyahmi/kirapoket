"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeOffIcon,
  BanknoteIcon,
  WalletIcon,
  CreditCardIcon,
  SmartphoneIcon,
  CircleEllipsisIcon,
  GripVerticalIcon,
  ListIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Account } from "@/lib/types";
import { cn } from "@/lib/utils";

type AccountType = Account["type"];

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank",
  cash: "Cash",
  ewallet: "E-Wallet",
  credit: "Credit Card",
  other: "Other",
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ElementType> = {
  bank: BanknoteIcon,
  cash: WalletIcon,
  ewallet: SmartphoneIcon,
  credit: CreditCardIcon,
  other: CircleEllipsisIcon,
};

const ACCOUNT_TYPE_COLORS: Record<AccountType, { bg: string; icon: string; dot: string }> = {
  bank:    { bg: "bg-blue-100 dark:bg-blue-900/30",   icon: "text-blue-600 dark:text-blue-400",     dot: "#3b82f6" },
  cash:    { bg: "bg-green-100 dark:bg-green-900/30", icon: "text-green-600 dark:text-green-400",   dot: "#22c55e" },
  ewallet: { bg: "bg-purple-100 dark:bg-purple-900/30", icon: "text-purple-600 dark:text-purple-400", dot: "#a855f7" },
  credit:  { bg: "bg-orange-100 dark:bg-orange-900/30", icon: "text-orange-500 dark:text-orange-400", dot: "#f97316" },
  other:   { bg: "bg-slate-100 dark:bg-slate-800",    icon: "text-slate-500 dark:text-slate-400",   dot: "#94a3b8" },
};

interface AccountFormData {
  name: string;
  type: AccountType;
  balance: string;
}

const DEFAULT_FORM: AccountFormData = {
  name: "",
  type: "bank",
  balance: "0",
};

function SortableAccountRow({
  account,
  formatMoney,
  onEdit,
  onDelete,
}: {
  account: Account;
  formatMoney: (n: number) => string;
  onEdit: (a: Account) => void;
  onDelete: (a: Account) => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id });
  const Icon = ACCOUNT_TYPE_ICONS[account.type];
  const colors = ACCOUNT_TYPE_COLORS[account.type];

  return (
    <>
      <Card
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn(isDragging && "opacity-50")}
      >
        <CardContent className="flex items-center gap-3 py-3">
          <button
            type="button"
            className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <div className={cn("flex items-center justify-center size-9 rounded-lg shrink-0", colors.bg)}>
              <Icon className={cn("size-4.5", colors.icon)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{account.name}</p>
              <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.type]}</p>
            </div>
            <p className="text-sm font-semibold tabular-nums shrink-0">{formatMoney(account.balance)}</p>
          </button>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className={cn("flex items-center justify-center size-8 rounded-lg shrink-0", colors.bg)}>
                <Icon className={cn("size-4", colors.icon)} />
              </div>
              {account.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Balance</span>
              <span className="text-lg font-bold tabular-nums">{formatMoney(account.balance)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{ACCOUNT_TYPE_LABELS[account.type]}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <Link href={`/transactions?account=${account.id}`} className="flex-1" onClick={() => setDetailOpen(false)}>
                <Button variant="outline" className="w-full gap-2">
                  <ListIcon className="size-4" /> Transactions
                </Button>
              </Link>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => { setDetailOpen(false); onEdit(account); }}
              >
                <PencilIcon className="size-4" /> Edit
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive shrink-0"
                onClick={() => { setDetailOpen(false); onDelete(account); }}
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AccountsPage() {
  const { accounts, loadingAccounts, userProfile, transactions, createAccount, editAccount, removeAccount, reorderAccounts } =
    useApp();

  const hideBalance = userProfile?.hideBalance ?? false;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = accounts.findIndex((a) => a.id === active.id);
    const newIndex = accounts.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(accounts, oldIndex, newIndex);
    try {
      await reorderAccounts(reordered.map((a) => a.id));
    } catch {
      toast.error("Failed to reorder.");
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const typeBreakdown = useMemo(() => {
    const totals: Partial<Record<AccountType, number>> = {};
    for (const a of accounts) {
      totals[a.type] = (totals[a.type] ?? 0) + a.balance;
    }
    return (Object.entries(totals) as [AccountType, number][])
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a);
  }, [accounts]);

  const formatMoney = (n: number) =>
    hideBalance
      ? "••••"
      : new Intl.NumberFormat("ms-MY", {
          style: "currency",
          currency: "MYR",
          minimumFractionDigits: 2,
        }).format(n);

  const openCreate = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditTarget(account);
    setForm({
      name: account.name,
      type: account.type,
      balance: account.balance.toFixed(2),
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Account name is required.");
      return;
    }
    const balance = parseFloat(form.balance);
    if (isNaN(balance)) {
      toast.error("Please enter a valid balance.");
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await editAccount(editTarget.id, {
          name: form.name.trim(),
          type: form.type,
          balance,
        });
        toast.success("Account updated.");
      } else {
        await createAccount({
          name: form.name.trim(),
          type: form.type,
          balance,
        });
        toast.success("Account created.");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save account.");
    } finally {
      setSaving(false);
    }
  };

  const deleteBlockReason = useMemo(() => {
    if (!deleteTarget) return null;
    const txCount = transactions.filter(
      (t) => t.accountId === deleteTarget.id || t.toAccountId === deleteTarget.id
    ).length;
    if (txCount > 0)
      return `${txCount} transaction${txCount > 1 ? "s are" : " is"} linked to this account. Reassign or delete them first.`;
    return null;
  }, [deleteTarget, transactions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeAccount(deleteTarget.id);
      toast.success("Account deleted.");
    } catch {
      toast.error("Failed to delete account.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Accounts</h1>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <PlusIcon className="size-4" /> Add
        </Button>
      </div>

      {/* Total Balance */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Balance</p>
              <p className="text-2xl font-bold tabular-nums">{formatMoney(totalBalance)}</p>
            </div>
            {hideBalance && <EyeOffIcon className="size-5 text-muted-foreground" />}
          </div>
          {accounts.length > 0 && totalBalance > 0 && !hideBalance && (
            <>
              <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                {typeBreakdown.map(([type, val]) => (
                  <div
                    key={type}
                    className="h-full rounded-full"
                    style={{ width: `${(val / totalBalance) * 100}%`, backgroundColor: ACCOUNT_TYPE_COLORS[type].dot }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {typeBreakdown.map(([type, val]) => (
                  <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: ACCOUNT_TYPE_COLORS[type].dot }} />
                    <span>{ACCOUNT_TYPE_LABELS[type]}</span>
                    <span className="tabular-nums font-medium text-foreground">{formatMoney(val)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Account List */}
      {loadingAccounts ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <p className="text-sm">No accounts yet. Add your first one!</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={accounts.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {accounts.map((account) => (
                <SortableAccountRow
                  key={account.id}
                  account={account}
                  formatMoney={formatMoney}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Account" : "Add Account"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Name</Label>
              <Input
                id="account-name"
                placeholder="e.g. Maybank Savings"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: v as AccountType })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{ACCOUNT_TYPE_LABELS[form.type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(ACCOUNT_TYPE_LABELS) as [
                      AccountType,
                      string
                    ][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-balance">Current Balance (MYR)</Label>
              <Input
                id="account-balance"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editTarget ? "Save Changes" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          {deleteBlockReason ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{deleteBlockReason}</p>
              <Link
                href={`/transactions?account=${deleteTarget?.id}`}
                onClick={() => setDeleteTarget(null)}
                className="inline-flex items-center justify-center w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                View linked transactions
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              {deleteBlockReason ? "OK" : "Cancel"}
            </Button>
            {!deleteBlockReason && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
