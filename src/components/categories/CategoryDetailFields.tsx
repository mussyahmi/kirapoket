"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WeekdayPicker } from "@/components/budget/WeekdayPicker";
import { cn } from "@/lib/utils";
import type { CycleRange } from "@/lib/budget";

/**
 * The fields a level-3 category carries: its budget, when its bill falls due,
 * and a note.
 *
 * Categories and Budget both edit the same category through their own dialog,
 * and for a while they did it with two hand-maintained copies of this markup.
 * They drifted: a due day added to one was missing from the other, and the
 * next field would have drifted the same way. One component, rendered twice.
 */
export interface CategoryDetails {
  budgetType: "cycle" | "daily";
  budget: string;
  budgetWeekdays: number[];
  dueDay: string;
  note: string;
}

export function CategoryDetailFields<T extends CategoryDetails>({
  form,
  setForm,
  cycle,
  idPrefix,
}: {
  form: T;
  setForm: (next: T) => void;
  cycle: CycleRange;
  /** Keeps input ids unique when both dialogs exist in one tree. */
  idPrefix: string;
}) {
  const set = (patch: Partial<T>) => setForm({ ...form, ...patch });

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Budget (optional)</Label>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(["cycle", "daily"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set({ budgetType: t } as Partial<T>)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  form.budgetType === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {t === "cycle" ? "Whole cycle" : "Per day"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {form.budgetType === "cycle"
              ? "One amount for the whole cycle, like RM400 for groceries."
              : "An amount for each day you pick, like RM15 for lunch on workdays."}
          </p>
        </div>

        {form.budgetType === "cycle" ? (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-budget`}>Amount (MYR)</Label>
            <Input
              id={`${idPrefix}-budget`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.budget}
              onChange={(e) => set({ budget: e.target.value } as Partial<T>)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-budget-daily`}>
                Amount / day (MYR)
              </Label>
              <Input
                id={`${idPrefix}-budget-daily`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.budget}
                onChange={(e) => set({ budget: e.target.value } as Partial<T>)}
              />
            </div>
            <WeekdayPicker
              value={form.budgetWeekdays}
              onChange={(days) =>
                set({ budgetWeekdays: days } as unknown as Partial<T>)
              }
              amount={parseFloat(form.budget) || 0}
              cycle={cycle}
            />
          </div>
        )}

        {/* A bill, not an allowance. Sits with the budget because the two work
            together: the budget is the amount expected, this is by when. */}
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-due-day`}>Due day (optional)</Label>
          <Input
            id={`${idPrefix}-due-day`}
            type="number"
            inputMode="numeric"
            min="1"
            max="31"
            placeholder="e.g. 15"
            value={form.dueDay}
            onChange={(e) => set({ dueDay: e.target.value } as Partial<T>)}
          />
          <p className="text-xs text-muted-foreground">
            For bills that come round every month, like a loan or a utility.
            KiraPoket works out whether it has been paid from what you spend in
            this category
            {form.budget.trim() && form.budgetType === "cycle"
              ? ", counting it settled once the budget amount is reached."
              : ". Set a budget too and it can tell part paid from paid."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-note`}>Note (optional)</Label>
        <Textarea
          id={`${idPrefix}-note`}
          placeholder="Add a note..."
          rows={3}
          value={form.note}
          onChange={(e) => set({ note: e.target.value } as Partial<T>)}
        />
      </div>
    </>
  );
}
