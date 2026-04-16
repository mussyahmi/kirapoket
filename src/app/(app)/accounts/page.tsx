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
} from "lucide-react";
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

export default function AccountsPage() {
  const { accounts, loadingAccounts, userProfile, transactions, createAccount, editAccount, removeAccount } =
    useApp();

  const hideBalance = userProfile?.hideBalance ?? false;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

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
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold">{formatMoney(totalBalance)}</p>
            </div>
            {hideBalance && (
              <EyeOffIcon className="size-5 text-muted-foreground" />
            )}
          </div>
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
        <div className="space-y-2">
          {accounts.map((account) => {
            const Icon = ACCOUNT_TYPE_ICONS[account.type];
            return (
              <Card key={account.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="flex items-center justify-center size-10 rounded-lg bg-muted shrink-0">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">
                      {formatMoney(account.balance)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(account)}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(account)}
                    >
                      <TrashIcon className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
