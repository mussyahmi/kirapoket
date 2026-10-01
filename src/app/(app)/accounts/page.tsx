"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { countAccountTransactions } from "@/lib/firestore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { OnboardingNextModal } from "@/components/common/OnboardingNextModal";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  WalletIcon,
  GripVerticalIcon,
  ListIcon,
  Loader2Icon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  ChevronDownIcon,
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
import { RowSkeleton, LoadError } from "@/components/common/Skeletons";
import type { Account } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ACCOUNT_TINT, ACCOUNT_ICON, accountColor } from "@/lib/palette";

type AccountType = Account["type"];

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank",
  cash: "Cash",
  ewallet: "E-Wallet",
  credit: "Credit Card",
  savings: "Savings",
  other: "Other",
};

const ACCOUNT_TYPE_COLORS = ACCOUNT_TINT;
const ACCOUNT_TYPE_ICONS = ACCOUNT_ICON;

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
  onToggleArchive,
  readOnly,
}: {
  account: Account;
  formatMoney: (n: number) => string;
  onEdit?: (a: Account) => void;
  onDelete?: (a: Account) => void;
  onToggleArchive?: (a: Account) => void;
  readOnly?: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id });
  const Icon = ACCOUNT_TYPE_ICONS[account.type];
  const colors = ACCOUNT_TYPE_COLORS[account.type];

  return (
    <>
      <Card
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn(
          isDragging && "opacity-50",
          account.archived && "bg-muted/40",
        )}
      >
        <CardContent className="flex items-center gap-3 py-3">
          {!readOnly && !account.archived && (
            <button
              type="button"
              className="text-muted-foreground/70 hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
              aria-label="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <GripVerticalIcon className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <div
              className={cn(
                "flex items-center justify-center size-9 rounded-lg shrink-0",
                colors.bg,
                account.archived && "opacity-60",
              )}
            >
              <Icon className={cn("size-4.5", colors.icon)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{account.name}</p>
              <p className="text-xs text-muted-foreground">
                {ACCOUNT_TYPE_LABELS[account.type]}
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums shrink-0">
              {formatMoney(account.balance)}
            </p>
          </button>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center justify-center size-8 rounded-lg shrink-0",
                  colors.bg,
                )}
              >
                <Icon className={cn("size-4", colors.icon)} />
              </div>
              {account.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Balance
              </span>
              <span className="text-lg font-bold tabular-nums">
                {formatMoney(account.balance)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">
                {ACCOUNT_TYPE_LABELS[account.type]}
              </span>
            </div>
            {account.archived && (
              <p className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                Archived. Hidden from pickers and left out of your total
                balance. Its past transactions are untouched.
              </p>
            )}
            {/* One primary action, one secondary beside it, and the
                lifecycle actions set apart below as quiet tertiary text. */}
            <div className="pt-1">
              <div className="flex gap-2">
                <Link
                  href={`/transactions?account=${account.id}`}
                  className={onEdit ? "flex-1" : "w-full"}
                  onClick={() => setDetailOpen(false)}
                >
                  <Button size="lg" className="w-full gap-2">
                    <ListIcon /> Transactions
                  </Button>
                </Link>
                {onEdit && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setDetailOpen(false);
                      onEdit(account);
                    }}
                  >
                    <PencilIcon /> Edit
                  </Button>
                )}
              </div>
              {(onToggleArchive || onDelete) && (
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  {onToggleArchive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 gap-2 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setDetailOpen(false);
                        onToggleArchive(account);
                      }}
                    >
                      {account.archived ? (
                        <>
                          <ArchiveRestoreIcon /> Unarchive
                        </>
                      ) : (
                        <>
                          <ArchiveIcon /> Archive
                        </>
                      )}
                    </Button>
                  ) : (
                    <span />
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-mr-2 gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setDetailOpen(false);
                        onDelete(account);
                      }}
                    >
                      <TrashIcon /> Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    accounts,
    activeAccounts,
    loadingAccounts,
    transactions,
    createAccount,
    editAccount,
    removeAccount,
    setAccountArchived,
    reorderAccounts,
    isViewingPartner,
    isImpersonating,
    loadError,
    refreshAccounts,
  } = useApp();

  const isReadOnly = isViewingPartner || isImpersonating;
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Account | null>(null);
  const [archiving, setArchiving] = useState(false);
  const archivedAccounts = useMemo(
    () => accounts.filter((a) => a.archived),
    [accounts],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeAccounts.findIndex((a) => a.id === active.id);
    const newIndex = activeAccounts.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(activeAccounts, oldIndex, newIndex);
    try {
      await reorderAccounts(reordered.map((a) => a.id));
    } catch {
      toast.error("Failed to reorder.");
    }
  };

  const totalBalance = activeAccounts.reduce((s, a) => s + a.balance, 0);

  const typeBreakdown = useMemo(() => {
    const totals: Partial<Record<AccountType, number>> = {};
    for (const a of activeAccounts) {
      totals[a.type] = (totals[a.type] ?? 0) + a.balance;
    }
    return (Object.entries(totals) as [AccountType, number][])
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a);
  }, [activeAccounts]);

  const formatMoney = (n: number) => {
    const v = parseFloat(n.toFixed(2));
    return new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(v === 0 ? 0 : v);
  };

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
        if (
          activeAccounts.length === 0 &&
          searchParams.get("from") === "onboarding"
        ) {
          setOnboardingModalOpen(true);
        } else {
          toast.success("Account created.");
        }
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save account.");
    } finally {
      setSaving(false);
    }
  };

  // Linked-transaction count for the delete target — queried server-side across
  // the WHOLE collection (the in-memory list is capped at 500). null = checking.
  const [linkedCount, setLinkedCount] = useState<number | null>(null);
  useEffect(() => {
    if (!deleteTarget) {
      setLinkedCount(null);
      return;
    }
    let cancelled = false;
    setLinkedCount(null); // show"checking…"
    countAccountTransactions(deleteTarget.userId, deleteTarget.id)
      .then((n) => {
        if (!cancelled) setLinkedCount(n);
      })
      .catch(() => {
        // Fall back to the (capped) in-memory count so we never delete blindly
        if (!cancelled) {
          setLinkedCount(
            transactions.filter(
              (t) =>
                t.accountId === deleteTarget.id ||
                t.toAccountId === deleteTarget.id,
            ).length,
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [deleteTarget, transactions]);

  const checkingLinked = !!deleteTarget && linkedCount === null;
  const deleteBlocked = !!deleteTarget && !!linkedCount && linkedCount > 0;

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

  const runToggleArchive = async (account: Account) => {
    const next = !account.archived;
    setArchiving(true);
    try {
      await setAccountArchived(account.id, next);
      if (next) setArchivedOpen(true);
      toast.success(next ? "Account archived." : "Account unarchived.");
      setArchiveTarget(null);
    } catch {
      toast.error(next ? "Failed to archive." : "Failed to unarchive.");
    } finally {
      setArchiving(false);
    }
  };

  // Archiving pulls an account out of every picker and total, so it gets a
  // confirm. Unarchiving only puts things back, so it goes straight through.
  const handleToggleArchive = (account: Account) => {
    if (account.archived) void runToggleArchive(account);
    else setArchiveTarget(account);
  };

  return (
    <div className="p-4 md:p-6 max-w-content mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Accounts</h1>
        {!isReadOnly && (
          <Button size="sm" onClick={openCreate} className="gap-2">
            <PlusIcon /> Add
          </Button>
        )}
      </div>

      {/* Total Balance */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Total Balance
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {formatMoney(totalBalance)}
              </p>
            </div>
          </div>
          {activeAccounts.length > 0 && totalBalance > 0 && (
            <>
              <div className="flex h-2 rounded-full overflow-hidden gap-px">
                {typeBreakdown.map(([type, val]) => (
                  <div
                    key={type}
                    className="h-full rounded-full"
                    style={{
                      width: `${(val / totalBalance) * 100}%`,
                      backgroundColor: accountColor(type),
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {typeBreakdown.map(([type, val]) => (
                  <div
                    key={type}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: accountColor(type) }}
                    />
                    <span>{ACCOUNT_TYPE_LABELS[type]}</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {formatMoney(val)}
                    </span>
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
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : loadError.accounts ? (
        <LoadError what="accounts" onRetry={refreshAccounts} />
      ) : activeAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <WalletIcon className="size-7 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">
              {archivedAccounts.length > 0
                ? "No active accounts"
                : "No accounts yet"}
            </p>
            <p className="mx-auto max-w-[32ch] text-sm text-muted-foreground">
              {archivedAccounts.length > 0
                ? "Everything you have is archived. Add a new account, or unarchive one below."
                : "Add the bank, cash, or e-wallet you spend from. Every transaction is tracked against an account."}
            </p>
          </div>
          {!isReadOnly && (
            <Button className="gap-2" onClick={openCreate}>
              <PlusIcon />{" "}
              {archivedAccounts.length > 0
                ? "Add an account"
                : "Add your first account"}
            </Button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activeAccounts.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {activeAccounts.map((account) => (
                <SortableAccountRow
                  key={account.id}
                  account={account}
                  formatMoney={formatMoney}
                  onEdit={isReadOnly ? undefined : openEdit}
                  onDelete={isReadOnly ? undefined : setDeleteTarget}
                  onToggleArchive={isReadOnly ? undefined : handleToggleArchive}
                  readOnly={isReadOnly}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Archived: collapsed by default, out of the totals above */}
      {!loadingAccounts && archivedAccounts.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setArchivedOpen((o) => !o)}
            className="flex w-full items-center gap-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={archivedOpen}
          >
            <ArchiveIcon className="size-4 shrink-0" />
            <span className="font-medium">
              Archived ({archivedAccounts.length})
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 shrink-0 transition-transform",
                archivedOpen && "rotate-180",
              )}
            />
          </button>
          {archivedOpen && (
            /* Rows share the sortable component, so they still need a dnd-kit
               ancestor, but archived rows render no drag handle, so nothing
               here is actually draggable. */
            <DndContext sensors={sensors} collisionDetection={closestCenter}>
              <SortableContext
                items={archivedAccounts.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {archivedAccounts.map((account) => (
                    <SortableAccountRow
                      key={account.id}
                      account={account}
                      formatMoney={formatMoney}
                      onEdit={isReadOnly ? undefined : openEdit}
                      onDelete={isReadOnly ? undefined : setDeleteTarget}
                      onToggleArchive={
                        isReadOnly ? undefined : handleToggleArchive
                      }
                      readOnly={isReadOnly}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
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
            <div className="space-y-2">
              <Label htmlFor="account-name">Name</Label>
              <Input
                id="account-name"
                placeholder="e.g. Maybank"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
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
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
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

      {/* Archive Confirm */}
      <Dialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Archive <strong>{archiveTarget?.name}</strong>? It will be hidden
              from your account lists and pickers, and its balance of{" "}
              <strong>{formatMoney(archiveTarget?.balance ?? 0)}</strong> will
              be left out of your total.
            </p>
            <p className="text-sm text-muted-foreground">
              Nothing is deleted. Its past transactions stay exactly as they
              are, and you can unarchive it at any time.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchiveTarget(null)}
              disabled={archiving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => archiveTarget && runToggleArchive(archiveTarget)}
              disabled={archiving}
              className="gap-2"
            >
              <ArchiveIcon /> {archiving ? "Archiving..." : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteBlocked ? "Can't delete this account" : "Delete Account"}
            </DialogTitle>
          </DialogHeader>
          {checkingLinked ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Checking linked transactions…
            </p>
          ) : deleteBlocked ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong className="font-semibold text-foreground">
                  {linkedCount} transaction{linkedCount === 1 ? "" : "s"}
                </strong>{" "}
                still {linkedCount === 1 ? "points" : "point"} at{" "}
                {deleteTarget?.name}. Reassign or delete{" "}
                {linkedCount === 1 ? "it" : "them"} first.
              </p>
              {!deleteTarget?.archived && (
                <p className="text-sm text-muted-foreground">
                  Archiving keeps all of it. The account drops out of your lists
                  and total balance, and every transaction stays where it is.
                </p>
              )}
              <Link
                href={`/transactions?account=${deleteTarget?.id}`}
                onClick={() => setDeleteTarget(null)}
                className="inline-block text-sm font-medium text-primary hover:link-underline"
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
              Cancel
            </Button>
            {deleteBlocked
              ? !deleteTarget?.archived && (
                  <Button
                    className="gap-2"
                    onClick={() => {
                      const target = deleteTarget;
                      setDeleteTarget(null);
                      if (target) setArchiveTarget(target);
                    }}
                  >
                    <ArchiveIcon /> Archive instead
                  </Button>
                )
              : /* Kept mounted (disabled) while the count is still loading,
                   so the footer doesn't jump once it lands. */
                <Button
                  variant="destructive-solid"
                  onClick={handleDelete}
                  disabled={deleting || checkingLinked}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OnboardingNextModal
        open={onboardingModalOpen}
        onClose={() => setOnboardingModalOpen(false)}
        completedStep="Account added!"
        nextStep="Record your first transaction"
        nextDescription="Log an expense or income to start tracking."
        ctaLabel="Add Transaction"
        ctaHref="/transactions/new?from=onboarding"
      />
    </div>
  );
}

export default function AccountsPageWrapper() {
  return (
    <Suspense>
      <AccountsPage />
    </Suspense>
  );
}
