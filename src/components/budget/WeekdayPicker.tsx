"use client";

import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { countWeekdays, type CycleRange } from "@/lib/budget";
import { cn } from "@/lib/utils";

// Monday first — how a Malaysian work week is read. Values follow Date.getDay().
const DAYS = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
];

const PRESETS: { label: string; days: number[] }[] = [
  { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Weekends", days: [0, 6] },
];

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && b.every((d) => a.includes(d));

/**
 * Picks which days of the week a per-day budget applies to. Replaces a
 * calendar of specific dates, which only ever described one cycle: weekdays
 * repeat, and the day count is recomputed from each cycle's own dates.
 */
export function WeekdayPicker({
  value,
  onChange,
  amount,
  cycle,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  /** Per-day amount as typed; used to preview this cycle's total. */
  amount: number;
  cycle: CycleRange;
}) {
  const days = countWeekdays(value, cycle);
  const toggle = (d: number) =>
    onChange(
      value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort(),
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Label>Which days?</Label>
        <div className="flex gap-3 text-xs">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange([...p.days])}
              className={cn(
                "link-underline transition-colors",
                sameDays(value, p.days)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div
        role="group"
        aria-label="Days of the week"
        className="grid grid-cols-7 gap-1"
      >
        {DAYS.map((d) => {
          const on = value.includes(d.value);
          return (
            <button
              key={d.value}
              type="button"
              aria-pressed={on}
              aria-label={d.long}
              onClick={() => toggle(d.value)}
              className={cn(
                "h-10 pointer-coarse:h-11 rounded-lg border text-xs font-medium transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {d.short}
            </button>
          );
        })}
      </div>
      {value.length === 0 ? (
        <p className="text-xs text-danger">Pick at least one day.</p>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {days} {days === 1 ? "day" : "days"} this cycle (
            {format(cycle.start, "d MMM")} – {format(cycle.end, "d MMM")})
          </span>
          {amount > 0 && (
            <span className="text-sm font-semibold tabular-nums">
              RM{" "}
              {(amount * days).toLocaleString("ms-MY", {
                minimumFractionDigits: 2,
              })}
            </span>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Repeats every cycle. The number of days is counted again each time.
      </p>
    </div>
  );
}
