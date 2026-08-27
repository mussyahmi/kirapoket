import { cn } from "@/lib/utils";

/**
 * Progress of spend against a total.
 *
 * Shared because /home and /budget each had their own copy, and both rounded
 * a non-zero remainder away — "0% left" printed directly under "RM 16.97
 * remaining" reads as a contradiction. Neither handled overspend either: a
 * negative remainder still showed "0% left" rather than saying it went over.
 */
export function SpendMeter({
  spent,
  total,
  remaining,
  barClassName,
  className,
}: {
  spent: number;
  total: number;
  remaining: number;
  barClassName?: string;
  className?: string;
}) {
  if (!(total > 0)) return null;
  const pct = (spent / total) * 100;
  const leftPct = 100 - pct;
  const over = remaining < 0;

  const spentLabel = pct >= 99.5 && pct < 100 ? "~100" : Math.round(pct);
  const rightLabel = over
    ? "over budget"
    : remaining > 0 && leftPct < 0.5
      ? "<1% left"
      : `${Math.max(0, Math.round(leftPct))}% left`;

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barClassName ?? (over ? "bg-danger" : "bg-primary"),
          )}
          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{spentLabel}% spent</span>
        <span className={cn(over && "text-danger")}>{rightLabel}</span>
      </div>
    </div>
  );
}
