"use client";

import { ArrowRightIcon, TriangleAlertIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BudgetImpact } from "@/lib/budget";

export type AccountImpact = {
  id: string;
  name: string;
  current: number;
  projected: number;
};

export type TxConfirmSummary = {
  type: "expense" | "income" | "transfer";
  amount: number;
  dateLabel: string;
  timeLabel?: string;
  categoryPath?: string;
  fromAccount?: string;
  toAccount?: string;
  note?: string;
};

const money = (n: number) => {
  const v = parseFloat(n.toFixed(2)) || 0;
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(v);
};

const typeAccent: Record<TxConfirmSummary["type"], string> = {
  expense: "text-red-600 dark:text-red-400",
  income: "text-green-600 dark:text-green-400",
  transfer: "text-blue-600 dark:text-blue-400",
};

const typeSign: Record<TxConfirmSummary["type"], string> = {
  expense: "-",
  income: "+",
  transfer: "",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  );
}

/**
 * A centred confirmation dialog shown before a transaction is saved. Lists the
 * entered details and how each account balance will change, blocking
 * confirmation when a change would overdraw an account.
 */
export function TransactionConfirmDialog({
  open,
  onOpenChange,
  mode,
  summary,
  impacts,
  budget,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  summary: TxConfirmSummary | null;
  impacts: AccountImpact[];
  budget?: BudgetImpact | null;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const anyShort = impacts.some((i) => i.projected < 0);
  const title = mode === "add" ? "Confirm new transaction" : "Confirm changes";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Review the transaction details and account balance changes before saving.
          </DialogDescription>
        </DialogHeader>

        {summary && (
          <div className="space-y-4">
            {/* Amount headline */}
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground capitalize">
                {summary.type}
              </p>
              <p className={cn("text-3xl font-bold tabular-nums mt-0.5", typeAccent[summary.type])}>
                {typeSign[summary.type]}
                {money(summary.amount)}
              </p>
            </div>

            {/* Details */}
            <div className="rounded-xl border border-border bg-muted/30 px-3 divide-y divide-border/60">
              <Row label="Date">
                {summary.dateLabel}
                {summary.timeLabel ? `, ${summary.timeLabel}` : ""}
              </Row>
              {summary.type === "transfer" ? (
                <Row label="Accounts">
                  <span className="inline-flex items-center gap-1.5">
                    {summary.fromAccount}
                    <ArrowRightIcon className="size-3.5 text-muted-foreground" />
                    {summary.toAccount}
                  </span>
                </Row>
              ) : (
                <Row label="Account">{summary.fromAccount}</Row>
              )}
              {summary.categoryPath && (
                <Row label="Category">{summary.categoryPath}</Row>
              )}
              {summary.note && <Row label="Note">{summary.note}</Row>}
            </div>

            {/* Account impact */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Account impact
              </p>
              <div className="space-y-2">
                {impacts.map((acc) => {
                  const short = acc.projected < 0;
                  return (
                    <div
                      key={acc.id}
                      className={cn(
                        "rounded-xl border px-3 py-2.5",
                        short ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{acc.name}</span>
                        <span className="flex items-center gap-1.5 tabular-nums text-sm">
                          <span className="text-muted-foreground">{money(acc.current)}</span>
                          <ArrowRightIcon className="size-3.5 text-muted-foreground" />
                          <span className={cn("font-semibold", short && "text-destructive")}>
                            {money(acc.projected)}
                          </span>
                        </span>
                      </div>
                      {short && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <TriangleAlertIcon className="size-3.5 shrink-0" />
                          Short by {money(Math.abs(acc.projected))} — not enough in this account.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Budget impact */}
            {budget && (() => {
              const over = budget.projected > budget.budget;
              const remaining = budget.budget - budget.projected;
              const pct = Math.min(100, Math.round((budget.projected / budget.budget) * 100));
              return (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Budget impact
                  </p>
                  <div
                    className={cn(
                      "rounded-xl border px-3 py-2.5",
                      over ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"
                    )}
                  >
                    {/* Category + remaining/over status */}
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{budget.categoryName}</span>
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs font-medium tabular-nums shrink-0",
                          over ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {over && <TriangleAlertIcon className="size-3.5 shrink-0" />}
                        {over
                          ? `${money(Math.abs(remaining))} over`
                          : `${money(remaining)} left`}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-primary")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Spent → projected of budget */}
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs tabular-nums text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        {money(budget.spent)}
                        <ArrowRightIcon className="size-3.5" />
                        <span className={cn("font-semibold text-foreground", over && "text-destructive")}>
                          {money(budget.projected)}
                        </span>
                      </span>
                      <span>of {money(budget.budget)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Back to edit
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={submitting || anyShort}
          >
            {submitting
              ? "Saving..."
              : mode === "add"
                ? "Confirm & add"
                : "Confirm & save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
