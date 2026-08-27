import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SpendMeter } from "@/components/common/SpendMeter";

/**
 * The cycle summary — one hero figure with two supporting ones.
 *
 * Shared by the live dashboard and the landing-page mock so the marketing
 * screenshot can never drift from the product it is advertising. Purely
 * presentational: every number arrives as a prop.
 */

const money = (n: number) => {
  const v = parseFloat(n.toFixed(2));
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(v === 0 ? 0 : v);
};

export function Delta({
  current,
  prev,
  direction = "expense",
  showZero,
}: {
  current: number;
  prev: number | undefined;
  direction?: "expense" | "income";
  showZero?: boolean;
}) {
  // Didn't exist last cycle (undefined) or had nothing in it →"new"
  if ((prev === undefined || prev === 0) && current > 0) {
    return (
      <span className="block text-xs tabular-nums text-muted-foreground">
        new
      </span>
    );
  }
  if (prev === undefined) return null;
  const diff = current - prev;
  if (Math.abs(diff) < 0.01) {
    return showZero ? (
      <span className="block text-xs tabular-nums text-muted-foreground">
        same as last
      </span>
    ) : null;
  }
  const up = diff > 0;
  const isGood = direction === "expense" ? !up : up;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs tabular-nums",
        isGood ? "text-success" : "text-danger",
      )}
    >
      <Icon className="size-3" />
      {money(Math.abs(diff))}
    </span>
  );
}

export interface CycleSummaryProps {
  remaining: number;
  income: number;
  expenses: number;
  hasPrev?: boolean;
  prevRemaining?: number;
  prevIncome?: number;
  prevExpenses?: number;
}

export function CycleSummaryCard({
  remaining,
  income,
  expenses,
  hasPrev = false,
  prevRemaining,
  prevIncome,
  prevExpenses,
}: CycleSummaryProps) {
  const spentPct = income > 0 ? (expenses / income) * 100 : null;
  const heroDiff = prevRemaining === undefined ? 0 : remaining - prevRemaining;
  const heroUp = heroDiff > 0;
  const HeroIcon = heroUp ? ArrowUpIcon : ArrowDownIcon;

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        {/* Hero — a tinted ground carries the mood so the number itself can
            stay neutral and simply be the biggest thing on the page. */}
        <div
          className={cn(
            "flex flex-col items-center gap-2 bg-gradient-to-b to-transparent px-6 pt-6 pb-6",
            remaining >= 0
              ? "from-primary/10 dark:from-primary/20"
              : "from-danger/10 dark:from-danger/25",
          )}
        >
          <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
            Remaining this cycle
          </p>
          <p
            className={cn(
              "text-4xl leading-none font-bold tabular-nums",
              remaining >= 0 ? "text-foreground" : "text-danger",
            )}
          >
            {money(remaining)}
          </p>
          {hasPrev && Math.abs(heroDiff) >= 0.01 && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium tabular-nums",
                heroUp
                  ? "bg-success-soft text-success-strong"
                  : "bg-danger-soft text-danger-strong",
              )}
            >
              <HeroIcon className="size-3" />
              {money(Math.abs(heroDiff))} vs last cycle
            </span>
          )}
          {spentPct !== null && (
            <SpendMeter
              className="max-w-xs pt-3"
              spent={expenses}
              total={income}
              remaining={remaining}
              barClassName={spentPct >= 100 ? "bg-danger" : "bg-primary"}
            />
          )}
        </div>
        {/* Supporting — the two inputs that produced the figure above */}
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          {[
            {
              label: "Income",
              value: income,
              prev: prevIncome,
              direction: "income" as const,
              icon: ArrowDownRightIcon,
              tint: "bg-success-soft text-success-strong",
              color: "text-success",
            },
            {
              label: "Expenses",
              value: expenses,
              prev: prevExpenses,
              direction: "expense" as const,
              icon: ArrowUpRightIcon,
              tint: "bg-danger-soft text-danger-strong",
              color: "text-danger",
            },
          ].map(
            ({ label, value, prev, direction, icon: Icon, tint, color }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-3 px-4 py-4"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    tint,
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p
                    className={cn(
                      "text-base font-semibold tabular-nums",
                      color,
                    )}
                  >
                    {money(value)}
                  </p>
                  {hasPrev && (
                    <div className="leading-tight">
                      <Delta
                        current={value}
                        prev={prev}
                        direction={direction}
                        showZero
                      />
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
