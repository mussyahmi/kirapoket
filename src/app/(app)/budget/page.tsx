"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  PlusIcon,
  Trash2Icon,
  GripVerticalIcon,
  SparklesIcon,
  TagsIcon,
  ListIcon,
  PencilIcon,
  InfoIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleHelpIcon,
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
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import {
  effectiveCatBudget,
  dailyBudgetDays,
  countWeekdays,
  initialWeekdays,
} from "@/lib/budget";
import { useCurrentCycle } from "@/hooks/useCurrentCycle";
import { WeekdayPicker } from "@/components/budget/WeekdayPicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { l1Color, tint } from "@/lib/palette";
import { SpendMeter } from "@/components/common/SpendMeter";
import type { Category, ForecastIncomeItem } from "@/lib/types";

interface L3EditForm {
  name: string;
  budgetType: "cycle" | "daily";
  budget: string;
  budgetWeekdays: number[];
  note: string;
  links: string[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(n);

function SortableForecastItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-1"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        tabIndex={-1}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/70 hover:text-foreground shrink-0"
      >
        <GripVerticalIcon className="size-3" />
      </button>
      {children}
    </div>
  );
}

/**
 * A summary line whose label can be tapped to reveal a one-sentence
 * explanation underneath. Every figure in the summary gets one: these are the
 * numbers a new user can't work out on their own.
 */
function ExplainRow({
  label,
  amount,
  info,
  open,
  onToggle,
  labelClassName,
  amountClassName,
  infoClassName,
  className,
}: {
  label: string;
  amount: React.ReactNode;
  info: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  labelClassName?: string;
  amountClassName?: string;
  infoClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={cn(
            "flex items-center gap-1 text-left transition-colors",
            labelClassName,
          )}
        >
          {label}
          <InfoIcon className="size-3 shrink-0" />
        </button>
        <span className={cn("amt tabular-nums shrink-0", amountClassName)}>
          {amount}
        </span>
      </div>
      {open && (
        <p
          className={cn(
            "text-xs leading-relaxed pl-3 border-l-2",
            infoClassName,
          )}
        >
          {info}
        </p>
      )}
    </div>
  );
}

export default function BudgetPage() {
  const router = useRouter();
  const {
    userProfile,
    categories,
    transactions,
    loadingTransactions,
    loadingProfile,
    saveUserProfile,
    editCategory,
    isImpersonating,
    isViewingPartner,
  } = useApp();
  const isReadOnly = isViewingPartner || isImpersonating;

  // The last Received/Expected pick, remembered per device. null = never
  // chosen, in which case the mode is derived below once income is known.
  const MODE_KEY = "budget:incomeMode";
  const [modeChoice, setModeChoice] = useState<"actual" | "forecast" | null>(
    () => {
      if (typeof window === "undefined") return null;
      try {
        const v = localStorage.getItem(MODE_KEY);
        return v === "actual" || v === "forecast" ? v : null;
      } catch {
        return null;
      }
    },
  );
  const setMode = (m: "actual" | "forecast") => {
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
    setModeChoice(m);
  };

  // Forecast income items (local draft, saved on change)
  const savedItems: ForecastIncomeItem[] =
    userProfile?.forecastIncomeItems ?? [];
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const [selectedL3, setSelectedL3] = useState<Category | null>(null);
  // Which summary row's explanation is showing (one at a time)
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const toggleInfo = (key: string) =>
    setOpenInfo((cur) => (cur === key ? null : key));
  const [helpOpen, setHelpOpen] = useState(false);

  const [l3EditOpen, setL3EditOpen] = useState(false);
  const [l3EditTarget, setL3EditTarget] = useState<Category | null>(null);
  const [l3EditForm, setL3EditForm] = useState<L3EditForm>({
    name: "",
    budgetType: "cycle",
    budget: "",
    budgetWeekdays: [],
    note: "",
    links: [],
  });
  const [l3EditSaving, setL3EditSaving] = useState(false);
  // null = no saved preference yet; fall back to auto-expanding the largest root
  const [expandedL1, setExpandedL1] = useState<Set<string> | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("budget:expandedL1");
      return raw ? new Set(JSON.parse(raw) as string[]) : null;
    } catch {
      return null;
    }
  });

  const openL3Edit = (cat: Category) => {
    setSelectedL3(null);
    setL3EditTarget(cat);
    setL3EditForm({
      name: cat.name,
      budgetType: cat.budgetType ?? "cycle",
      budget: cat.budget !== undefined ? String(cat.budget) : "",
      budgetWeekdays: initialWeekdays(cat),
      note: cat.note ?? "",
      links: cat.links ?? [],
    });
    setL3EditOpen(true);
  };

  const handleL3Save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l3EditTarget || !l3EditForm.name.trim()) return;
    const budget = l3EditForm.budget.trim()
      ? parseFloat(l3EditForm.budget)
      : undefined;
    if (l3EditForm.budget.trim() && (isNaN(budget!) || budget! < 0)) {
      toast.error("Invalid budget amount.");
      return;
    }
    const budgetType = l3EditForm.budget.trim()
      ? l3EditForm.budgetType
      : undefined;
    if (budgetType === "daily" && l3EditForm.budgetWeekdays.length === 0) {
      toast.error("Pick at least one day for this budget.");
      return;
    }
    const budgetWeekdays =
      budgetType === "daily" ? [...l3EditForm.budgetWeekdays].sort() : undefined;
    // Still written so older app versions (which only read a day count) show
    // this cycle's total; current code recounts from budgetWeekdays.
    const budgetDays = budgetWeekdays
      ? countWeekdays(budgetWeekdays, cycle)
      : undefined;
    setL3EditSaving(true);
    try {
      await editCategory(l3EditTarget.id, {
        name: l3EditForm.name.trim(),
        budget,
        budgetType,
        budgetDays,
        budgetWeekdays,
        // Legacy picked dates are superseded by weekdays; clear them on save
        budgetSelectedDates: undefined,
        note: l3EditForm.note.trim() || undefined,
        links:
          l3EditForm.links.filter((l) => l.trim()).length > 0
            ? l3EditForm.links.filter((l) => l.trim())
            : undefined,
      });
      toast.success("Category updated.");
      setL3EditOpen(false);
    } catch {
      toast.error("Failed to save.");
    } finally {
      setL3EditSaving(false);
    }
  };

  const handleAddItem = async () => {
    const amount = parseFloat(newAmount);
    if (!newLabel.trim() || isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      const item: ForecastIncomeItem = {
        id: Date.now().toString(),
        label: newLabel.trim(),
        amount,
      };
      await saveUserProfile({ forecastIncomeItems: [...savedItems, item] });
      setNewLabel("");
      setNewAmount("");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    await saveUserProfile({
      forecastIncomeItems: savedItems.filter((i) => i.id !== id),
    });
  };

  const startEdit = (item: ForecastIncomeItem) => {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditAmount(String(item.amount));
  };

  const handleSaveEdit = async () => {
    const amount = parseFloat(editAmount);
    if (!editLabel.trim() || isNaN(amount) || amount <= 0) return;
    await saveUserProfile({
      forecastIncomeItems: savedItems.map((i) =>
        i.id === editingId ? { ...i, label: editLabel.trim(), amount } : i,
      ),
    });
    setEditingId(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const handleReorderItems = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = savedItems.findIndex((i) => i.id === active.id);
    const newIndex = savedItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(savedItems, oldIndex, newIndex);
    await saveUserProfile({ forecastIncomeItems: reordered });
  };

  const cycle = useCurrentCycle();
  const { start, end } = cycle;
  const cycleLabel = `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;

  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  const cycleTransactions = useMemo(
    () => transactions.filter((t) => t.date >= startStr && t.date <= endStr),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, startStr, endStr],
  );

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const l2BudgetMap = useMemo(() => {
    const result: Record<string, number> = {};
    for (const c of categories) {
      if (c.level === 2) {
        result[c.id] = categories
          .filter((ch) => ch.level === 3 && ch.parentId === c.id)
          .reduce((s, ch) => s + effectiveCatBudget(ch, cycle), 0);
      }
    }
    return result;
  }, [categories, cycle]);

  const l3SpendingMap = useMemo(() => {
    const result: Record<string, number> = {};
    for (const t of cycleTransactions) {
      if (t.type !== "expense" || !t.categoryId) continue;
      const cat = categoryMap[t.categoryId];
      if (cat?.level === 3) result[cat.id] = (result[cat.id] ?? 0) + t.amount;
    }
    return result;
  }, [cycleTransactions, categoryMap]);

  const l2SpendingMap = useMemo(() => {
    const result: Record<string, number> = {};
    for (const t of cycleTransactions) {
      if (t.type !== "expense" || !t.categoryId) continue;
      let cat = categoryMap[t.categoryId];
      while (cat && cat.level !== 2 && cat.parentId)
        cat = categoryMap[cat.parentId];
      if (cat?.level === 2) result[cat.id] = (result[cat.id] ?? 0) + t.amount;
    }
    return result;
  }, [cycleTransactions, categoryMap]);

  const actualIncome = useMemo(
    () =>
      cycleTransactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
    [cycleTransactions],
  );

  const forecastIncome = useMemo(
    () => savedItems.reduce((s, i) => s + i.amount, 0),
    [savedItems],
  );

  // First visit: someone who listed expected income but hasn't been paid yet
  // this cycle would otherwise land on RM 0 income and a page of negatives.
  const mode =
    modeChoice ??
    (actualIncome === 0 && savedItems.length > 0 ? "forecast" : "actual");
  const effectiveIncome = mode === "forecast" ? forecastIncome : actualIncome;

  const totalSpent = useMemo(
    () =>
      cycleTransactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [cycleTransactions],
  );

  const totalBudgeted = useMemo(
    () => Object.values(l2BudgetMap).reduce((s, v) => s + v, 0),
    [l2BudgetMap],
  );

  const unbudgetedSpending = useMemo(() => {
    return cycleTransactions
      .filter((t) => t.type === "expense" && t.categoryId)
      .reduce((s, t) => {
        const cat = categoryMap[t.categoryId!];
        if (!cat) return s + t.amount;
        if (cat.level === 3)
          return effectiveCatBudget(cat, cycle) === 0 ? s + t.amount : s;
        if (cat.level === 2)
          return (l2BudgetMap[cat.id] ?? 0) === 0 ? s + t.amount : s;
        return s;
      }, 0);
  }, [cycleTransactions, categoryMap, l2BudgetMap, cycle]);

  const totalExceedAmount = useMemo(() => {
    return categories
      .filter((c) => c.level === 3)
      .reduce((s, c) => {
        const budget = effectiveCatBudget(c, cycle);
        if (budget <= 0) return s;
        const spent = l3SpendingMap[c.id] ?? 0;
        return spent > budget ? s + (spent - budget) : s;
      }, 0);
  }, [categories, l3SpendingMap, cycle]);

  const unallocated =
    effectiveIncome - totalBudgeted - unbudgetedSpending - totalExceedAmount;
  const actualRemaining = effectiveIncome - totalSpent;

  const l1Categories = useMemo(() => {
    const order: Record<string, number> = { needs: 0, wants: 1, savings: 2 };
    return categories
      .filter((c) => c.level === 1)
      .sort((a, b) => (order[a.type ?? ""] ?? 9) - (order[b.type ?? ""] ?? 9));
  }, [categories]);

  const hasBudgets = useMemo(
    () => Object.values(l2BudgetMap).some((v) => v > 0),
    [l2BudgetMap],
  );

  // Per-root spending totals, used to auto-expand the largest root by default
  const l1SpendingMap = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [l2id, amt] of Object.entries(l2SpendingMap)) {
      const parentId = categoryMap[l2id]?.parentId;
      if (parentId) result[parentId] = (result[parentId] ?? 0) + amt;
    }
    return result;
  }, [l2SpendingMap, categoryMap]);

  const largestL1Id = useMemo(() => {
    let id: string | null = null;
    let max = -1;
    for (const [k, v] of Object.entries(l1SpendingMap)) {
      if (v > max) {
        max = v;
        id = k;
      }
    }
    return id;
  }, [l1SpendingMap]);

  const effectiveExpanded = useMemo(
    () => expandedL1 ?? new Set(largestL1Id ? [largestL1Id] : []),
    [expandedL1, largestL1Id],
  );

  const toggleL1 = (id: string) => {
    const next = new Set(effectiveExpanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    try {
      localStorage.setItem("budget:expandedL1", JSON.stringify([...next]));
    } catch {}
    setExpandedL1(next);
  };

  const loading = loadingTransactions || loadingProfile;

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-content mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-content mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Budget</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{cycleLabel}</p>
          {/* Only until the first budget exists — after that it's noise */}
          {!hasBudgets && (
            <p className="text-sm text-muted-foreground mt-2 max-w-prose">
              Decide how much of this cycle&apos;s income goes to each
              category, then see how your spending keeps up.
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground"
          onClick={() => setHelpOpen(true)}
        >
          <CircleHelpIcon /> How it works
        </Button>
      </div>

      {/* AI Assistant entry point — §2: this feature does not exist yet, so it
          is a quiet link rather than a full-width gradient banner sitting above
          the page's actual content. */}
      <button
        type="button"
        onClick={() => router.push("/assistant")}
        className="flex w-full items-center gap-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <SparklesIcon className="size-3.5 shrink-0 text-warning" />
        <span>Ask AI about your spending</span>
        <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium">
          Soon
        </span>
        <ChevronRightIcon className="ml-auto size-3.5 shrink-0" />
      </button>

      <div className="space-y-6">
        {/* Forecast Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Summary</CardTitle>
              <div className="flex items-center gap-2">
                {/* Which income the summary is measured against */}
                <span className="text-xs text-muted-foreground">Income</span>
                <div
                  role="group"
                  aria-label="Which income to use"
                  className="flex rounded-lg overflow-hidden border border-border text-xs"
                >
                  {(
                    [
                      ["actual", "Received"],
                      ["forecast", "Expected"],
                    ] as const
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={mode === m}
                      onClick={() => setMode(m)}
                      className={cn(
                        "px-3 py-2 transition-colors",
                        mode === m
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Income display */}
            {mode === "actual" ? (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Income received</span>
                  <span className="font-medium tabular-nums text-success">
                    {fmt(actualIncome)}
                  </span>
                </div>
                {actualIncome === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No income logged this cycle yet. Log your salary when it
                    comes in, or switch to Expected to plan ahead.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Expected income
                    </span>
                    <span className="font-medium tabular-nums text-success">
                      {fmt(forecastIncome)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add the income you expect this cycle, so you can plan
                    before it arrives.
                  </p>
                </div>
                {/* Saved items */}
                {savedItems.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleReorderItems}
                  >
                    <SortableContext
                      items={savedItems.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2 pl-1 border-l-2 border-border">
                        {savedItems.map((item) =>
                          editingId === item.id ? (
                            <div
                              key={item.id}
                              className="flex gap-2 items-center pl-4"
                            >
                              <Input
                                autoFocus
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="flex-1 h-7 pointer-coarse:h-10 text-xs"
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleSaveEdit()
                                }
                              />
                              <Input
                                type="number"
                                inputMode="decimal"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-24 h-7 pointer-coarse:h-10 text-xs"
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleSaveEdit()
                                }
                              />
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="text-xs font-medium text-primary shrink-0"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-xs text-muted-foreground shrink-0"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <SortableForecastItem key={item.id} id={item.id}>
                              <div className="flex items-center justify-between text-xs group flex-1">
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  className="text-muted-foreground hover:text-foreground transition-colors text-left"
                                >
                                  {item.label}
                                </button>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(item)}
                                    className="amt tabular-nums text-success hover:link-underline"
                                  >
                                    {fmt(item.amount)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="text-muted-foreground hover:text-danger transition-colors"
                                  >
                                    <Trash2Icon className="size-3" />
                                  </button>
                                </div>
                              </div>
                            </SortableForecastItem>
                          ),
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
                {/* Add new item */}
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Salary, side income"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="flex-1 h-8 pointer-coarse:h-11 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  />
                  <Input
                    placeholder="Amount"
                    type="number"
                    inputMode="decimal"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-28 h-8 pointer-coarse:h-11 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 pointer-coarse:h-11 px-2"
                    onClick={handleAddItem}
                    disabled={saving}
                  >
                    <PlusIcon />
                  </Button>
                </div>
              </div>
            )}

            {/* Plan section */}
            <div className="overflow-hidden rounded-xl bg-muted/30 dark:bg-muted/50">
              <div className="px-3 pt-3 pb-1">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Your plan
                </span>
              </div>
              <div className="px-3 py-3 space-y-3">
                <ExplainRow
                  label="Set aside in budgets"
                  labelClassName="text-muted-foreground hover:text-foreground"
                  amount={
                    <>
                      <span className="text-foreground/40">−</span>{" "}
                      {fmt(totalBudgeted)}
                    </>
                  }
                  amountClassName="font-medium text-muted-foreground"
                  info="The total of every budget you've set for this cycle."
                  infoClassName="text-muted-foreground border-border"
                  open={openInfo === "budgeted"}
                  onToggle={() => toggleInfo("budgeted")}
                />
                {unbudgetedSpending > 0 && (
                  <ExplainRow
                    label="Spent without a budget"
                    labelClassName="text-warning-strong"
                    amount={
                      <>
                        <span className="text-warning-strong/70">−</span>{" "}
                        {fmt(unbudgetedSpending)}
                      </>
                    }
                    amountClassName="font-medium text-warning-strong"
                    info="Spending on items that don't have a budget yet. It still comes out of your income, so give them a budget if it happens often."
                    infoClassName="text-warning-strong border-warning/40"
                    open={openInfo === "unbudgeted"}
                    onToggle={() => toggleInfo("unbudgeted")}
                  />
                )}
                {totalExceedAmount > 0 && (
                  <ExplainRow
                    label="Spent over budget"
                    labelClassName="text-danger-strong hover:text-danger"
                    amount={
                      <>
                        <span className="text-danger/70">−</span>{" "}
                        {fmt(totalExceedAmount)}
                      </>
                    }
                    amountClassName="font-medium text-danger"
                    info="How far spending went past its budgets. It comes out of your income on top of the budgets themselves."
                    infoClassName="text-danger border-danger/40"
                    open={openInfo === "over"}
                    onToggle={() => toggleInfo("over")}
                  />
                )}
                <div className="space-y-2 border-t border-dashed border-border/60 pt-3 mt-0.5">
                  <ExplainRow
                    label="Left to budget"
                    labelClassName={cn(
                      "font-semibold",
                      unallocated < 0 ? "text-danger" : "text-info",
                    )}
                    amount={fmt(unallocated)}
                    amountClassName={cn(
                      "font-semibold",
                      unallocated < 0 ? "text-danger" : "text-info",
                    )}
                    info={`Your ${mode === "actual" ? "income received" : "expected income"}, minus everything above. It's money without a plan yet: give it a budget, or keep it as a buffer.`}
                    infoClassName="text-muted-foreground border-border"
                    open={openInfo === "left"}
                    onToggle={() => toggleInfo("left")}
                  />
                  {/* Negative is the one state that needs saying out loud */}
                  {unallocated < 0 && (
                    <p className="text-xs text-danger">
                      Your budgets and spending add up to more than your{" "}
                      {mode === "actual" ? "income received" : "expected income"}
                      .
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actuals section */}
            <div className="overflow-hidden rounded-xl bg-muted/30 dark:bg-muted/50">
              <div className="px-3 pt-3 pb-1">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  So far this cycle
                </span>
              </div>
              <div className="px-3 py-3 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-medium amt tabular-nums text-danger">
                    {fmt(totalSpent)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Left to spend</span>
                  <span
                    className={cn(
                      "amt tabular-nums",
                      actualRemaining < 0 ? "text-danger" : "text-success",
                    )}
                  >
                    {fmt(actualRemaining)}
                  </span>
                </div>
                {effectiveIncome > 0 && (
                  <SpendMeter
                    spent={totalSpent}
                    total={effectiveIncome}
                    remaining={actualRemaining}
                    barClassName={
                      actualRemaining < 0 ? "bg-danger" : "bg-success"
                    }
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Budgets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Budgets by category</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 pointer-coarse:size-10"
                onClick={() => router.push("/categories")}
                aria-label="Go to categories"
              >
                <TagsIcon className="text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!hasBudgets ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No budgets yet. Setting one takes a minute:
                </p>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>
                    Open Categories and pick an item, like Groceries under Food
                    &amp; Drinks.
                  </li>
                  <li>Enter how much you plan to spend on it each cycle.</li>
                  <li>
                    Come back here to see how much is spent and how much is
                    left.
                  </li>
                </ol>
                {!isReadOnly && (
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => router.push("/categories")}
                  >
                    <TagsIcon /> Set your first budget
                  </Button>
                )}
              </div>
            ) : (
              l1Categories.map((l1) => {
                const l2s = categories
                  .filter((c) => c.level === 2 && c.parentId === l1.id)
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

                const l2sVisible = l2s.filter(
                  (l2) =>
                    (l2BudgetMap[l2.id] ?? 0) > 0 ||
                    (l2SpendingMap[l2.id] ?? 0) > 0,
                );
                if (l2sVisible.length === 0) return null;

                const color = l1Color(l1.type);
                const isExpanded = effectiveExpanded.has(l1.id);
                const l1spent = l2sVisible.reduce(
                  (s, l2) => s + (l2SpendingMap[l2.id] ?? 0),
                  0,
                );
                const l1budget = l2sVisible.reduce(
                  (s, l2) => s + (l2BudgetMap[l2.id] ?? 0),
                  0,
                );
                const l1over = l1budget > 0 && l1spent > l1budget;
                return (
                  <div key={l1.id} className="space-y-3">
                    {/* L1 header */}
                    <button
                      type="button"
                      onClick={() => toggleL1(l1.id)}
                      aria-label={
                        isExpanded ? `Collapse ${l1.name}` : `Expand ${l1.name}`
                      }
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-1 -mx-1 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDownIcon
                          className={cn(
                            "size-3.5 shrink-0 text-muted-foreground transition-transform",
                            !isExpanded && "-rotate-90",
                          )}
                        />
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-sm font-semibold">{l1.name}</p>
                      </div>
                      <span
                        className={cn(
                          "amt tabular-nums text-xs shrink-0",
                          l1over ? "text-danger" : "text-muted-foreground",
                        )}
                      >
                        {fmt(l1spent)}
                        {l1budget > 0 && (
                          <span className="amt text-muted-foreground">
                            {" "}
                            / {fmt(l1budget)}
                          </span>
                        )}
                      </span>
                    </button>

                    {/* L2 rows */}
                    {isExpanded && (
                      <div
                        className="space-y-3 pl-4 border-l-2"
                        style={{ borderColor: tint(color, 40) }}
                      >
                        {l2sVisible.map((l2) => {
                          const l2budget = l2BudgetMap[l2.id] ?? 0;
                          const l2spent = l2SpendingMap[l2.id] ?? 0;

                          const l3s = categories
                            .filter(
                              (c) => c.level === 3 && c.parentId === l2.id,
                            )
                            .sort(
                              (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
                            );

                          const l2budgetedSpent = l3s.reduce(
                            (s, l3) =>
                              effectiveCatBudget(l3, cycle) > 0
                                ? s + (l3SpendingMap[l3.id] ?? 0)
                                : s,
                            0,
                          );
                          const l2remaining = l2budget - l2budgetedSpent;
                          const l2pct =
                            l2budget > 0
                              ? Math.min(
                                  (l2budgetedSpent / l2budget) * 100,
                                  100,
                                )
                              : null;
                          const l2over =
                            l2budget > 0 && l2budgetedSpent > l2budget;
                          const l3sVisible = l3s.filter(
                            (l3) =>
                              effectiveCatBudget(l3, cycle) > 0 ||
                              (l3SpendingMap[l3.id] ?? 0) > 0,
                          );

                          return (
                            <div key={l2.id} className="space-y-2">
                              {/* L2 name + amounts */}
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/transactions?category=${l2.id}&from=${startStr}&to=${endStr}`,
                                  )
                                }
                                className="flex items-center justify-between gap-2 text-sm rounded-lg px-1 -mx-1 hover:bg-muted/50 transition-colors w-full"
                              >
                                <span
                                  className={cn(
                                    "min-w-0 truncate font-medium text-left",
                                  )}
                                >
                                  {l2.name}
                                </span>
                                <span
                                  className={cn(
                                    "amt tabular-nums shrink-0 text-xs",
                                    l2over
                                      ? "text-danger"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {fmt(l2spent)}
                                  {l2budget > 0 && (
                                    <span className="amt text-muted-foreground">
                                      {" "}
                                      / {fmt(l2budget)}
                                    </span>
                                  )}
                                </span>
                              </button>
                              {/* Progress bar + remaining inline */}
                              {l2pct !== null && (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${l2pct}%`,
                                        backgroundColor: l2over
                                          ? "var(--danger)"
                                          : color,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={cn(
                                      "text-xs tabular-nums amt shrink-0 min-w-24 text-right",
                                      l2over
                                        ? "text-danger"
                                        : "text-muted-foreground",
                                    )}
                                  >
                                    {l2over
                                      ? `${fmt(Math.abs(l2remaining))} over`
                                      : l2remaining === 0
                                        ? "Used up"
                                        : `${fmt(l2remaining)} left`}
                                  </span>
                                </div>
                              )}
                              {/* L3 rows */}
                              {l3sVisible.length > 0 && (
                                <div className="space-y-1 pt-0.5 pl-3 border-l border-border/40">
                                  {l3sVisible.map((l3) => {
                                    const l3budget = effectiveCatBudget(l3, cycle);
                                    const l3spent = l3SpendingMap[l3.id] ?? 0;
                                    const l3remaining = l3budget - l3spent;
                                    const l3over =
                                      l3budget > 0 && l3spent > l3budget;

                                    return (
                                      <button
                                        key={l3.id}
                                        type="button"
                                        onClick={() => setSelectedL3(l3)}
                                        className="flex items-center justify-between gap-2 text-xs rounded-lg px-1 -mx-1 hover:bg-muted/50 transition-colors w-full"
                                      >
                                        <span
                                          className={cn(
                                            "min-w-0 truncate text-left",
                                            l3over
                                              ? "text-danger-strong hover:text-danger"
                                              : l3budget === 0
                                                ? "text-warning-strong hover:text-foreground"
                                                : "text-muted-foreground/80 hover:text-muted-foreground",
                                          )}
                                        >
                                          {l3.name}
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span
                                            className={cn(
                                              "amt tabular-nums",
                                              l3over
                                                ? "text-danger"
                                                : l3budget === 0
                                                  ? "text-warning-strong"
                                                  : "text-muted-foreground",
                                            )}
                                          >
                                            {fmt(l3spent)}
                                            {l3budget > 0 && (
                                              <span className="amt text-muted-foreground">
                                                {" "}
                                                / {fmt(l3budget)}
                                              </span>
                                            )}
                                          </span>
                                          {l3budget === 0 ? (
                                            <span className="text-xs text-warning-strong">
                                              (no budget)
                                            </span>
                                          ) : (
                                            <span
                                              className={cn(
                                                "text-xs amt tabular-nums",
                                                l3over
                                                  ? "text-danger"
                                                  : "text-muted-foreground",
                                              )}
                                            >
                                              {l3over
                                                ? `(${fmt(Math.abs(l3remaining))} over)`
                                                : l3remaining === 0
                                                  ? "(used up)"
                                                  : `(${fmt(l3remaining)} left)`}
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* L3 category detail modal */}
      {(() => {
        const l3 = selectedL3;
        if (!l3) return null;
        const l3budget = effectiveCatBudget(l3, cycle);
        const l3spent = l3SpendingMap[l3.id] ?? 0;
        const l3over = l3budget > 0 && l3spent > l3budget;
        const l1 = categories.find((c) => {
          const l2 = categories.find((x) => x.id === l3.parentId);
          return l2 && c.id === l2.parentId;
        });
        const color = l1Color(l1?.type);
        return (
          <Dialog
            open={!!selectedL3}
            onOpenChange={(open) => {
              if (!open) setSelectedL3(null);
            }}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {l3.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {l3budget > 0 && (
                  <div className="rounded-xl px-4 py-3 flex items-center justify-between bg-muted/50">
                    <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                      Budget
                    </p>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        {fmt(l3budget)}
                      </p>
                      {l3.budgetType === "daily" &&
                        l3.budget !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            {fmt(l3.budget)}/day ×{" "}
                            {dailyBudgetDays(l3, cycle)} days this cycle
                          </p>
                        )}
                    </div>
                  </div>
                )}
                {l3spent > 0 && (
                  <div
                    className={cn(
                      "rounded-xl px-4 py-3 flex items-center justify-between",
                      l3over ? "bg-danger-soft" : "bg-success-soft",
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-semibold tracking-widest uppercase",
                        l3over ? "text-danger" : "text-success",
                      )}
                    >
                      Spent
                    </p>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        l3over ? "text-danger" : "text-success",
                      )}
                    >
                      {fmt(l3spent)}
                    </p>
                  </div>
                )}
                {l3.note && (
                  <div className="rounded-xl px-4 py-3 bg-muted/50 space-y-1">
                    <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                      Note
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{l3.note}</p>
                  </div>
                )}
                {l3.links && l3.links.length > 0 && (
                  <div className="rounded-xl px-4 py-3 bg-muted/50 space-y-2">
                    <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                      Links
                    </p>
                    {l3.links.map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-primary link-underline truncate"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setSelectedL3(null);
                      router.push(
                        `/transactions?category=${l3.id}&from=${startStr}&to=${endStr}`,
                      );
                    }}
                  >
                    <ListIcon /> Transactions
                  </Button>
                  {!isReadOnly && (
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => openL3Edit(l3)}
                    >
                      <PencilIcon /> Edit
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Image preview modal (iOS long-press to copy/save) */}
      {/* L3 Edit Dialog */}
      <Dialog open={l3EditOpen} onOpenChange={setL3EditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {l3EditTarget?.name ?? "item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleL3Save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="l3-name">Name</Label>
              <Input
                id="l3-name"
                value={l3EditForm.name}
                onChange={(e) =>
                  setL3EditForm({ ...l3EditForm, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Budget (optional)</Label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(["cycle", "daily"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setL3EditForm({ ...l3EditForm, budgetType: t })
                      }
                      className={cn(
                        "flex-1 py-2 text-sm font-medium transition-colors",
                        l3EditForm.budgetType === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {t === "cycle" ? "Whole cycle" : "Per day"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {l3EditForm.budgetType === "cycle"
                    ? "One amount for the whole cycle, like RM400 for groceries."
                    : "An amount for each day you pick, like RM15 for lunch on workdays."}
                </p>
              </div>
              {l3EditForm.budgetType === "cycle" ? (
                <div className="space-y-2">
                  <Label>Amount (MYR)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={l3EditForm.budget}
                    onChange={(e) =>
                      setL3EditForm({ ...l3EditForm, budget: e.target.value })
                    }
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Amount / day (MYR)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={l3EditForm.budget}
                      onChange={(e) =>
                        setL3EditForm({ ...l3EditForm, budget: e.target.value })
                      }
                    />
                  </div>
                  <WeekdayPicker
                    value={l3EditForm.budgetWeekdays}
                    onChange={(days) =>
                      setL3EditForm({ ...l3EditForm, budgetWeekdays: days })
                    }
                    amount={parseFloat(l3EditForm.budget) || 0}
                    cycle={cycle}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="l3-note">Note (optional)</Label>
              <Textarea
                id="l3-note"
                placeholder="Add a note..."
                rows={3}
                value={l3EditForm.note}
                onChange={(e) =>
                  setL3EditForm({ ...l3EditForm, note: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Links (optional)</Label>
              <div className="space-y-2">
                {l3EditForm.links.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={link}
                      onChange={(e) => {
                        const updated = [...l3EditForm.links];
                        updated[i] = e.target.value;
                        setL3EditForm({ ...l3EditForm, links: updated });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setL3EditForm({
                          ...l3EditForm,
                          links: l3EditForm.links.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <Trash2Icon className="text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    setL3EditForm({
                      ...l3EditForm,
                      links: [...l3EditForm.links, ""],
                    })
                  }
                >
                  <PlusIcon className="mr-2" /> Add link
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setL3EditOpen(false)}
                disabled={l3EditSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={l3EditSaving}>
                {l3EditSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* How it works — the questions a first-time user asks on this page */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How budgets work</DialogTitle>
          </DialogHeader>
          <dl className="space-y-4 text-sm">
            <div className="space-y-1">
              <dt className="font-medium">What&apos;s a cycle?</dt>
              <dd className="text-muted-foreground leading-relaxed">
                The stretch from one payday to the day before the next. This
                cycle runs {cycleLabel}. Spending starts from zero each cycle
                and your budgets apply again.
                {!userProfile?.salaryDay && (
                  <>
                    {" "}
                    You haven&apos;t set a payday yet, so the 25th is used.
                    You can change it in{" "}
                    <button
                      type="button"
                      className="link-underline text-foreground"
                      onClick={() => {
                        setHelpOpen(false);
                        router.push("/settings");
                      }}
                    >
                      Settings
                    </button>
                    .
                  </>
                )}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="font-medium">Where do I set a budget?</dt>
              <dd className="text-muted-foreground leading-relaxed">
                On the Categories page. Budgets go on items, the smallest
                level, like Groceries under Food &amp; Drinks. Any item with a
                budget or spending this cycle shows up here.
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="font-medium">Received or Expected income?</dt>
              <dd className="text-muted-foreground leading-relaxed">
                Received uses the income you&apos;ve logged this cycle.
                Expected uses a list you type in, so you can plan before your
                salary arrives.
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="font-medium">
                What does &ldquo;Left to budget&rdquo; mean?
              </dt>
              <dd className="text-muted-foreground leading-relaxed">
                Income that doesn&apos;t have a plan yet: your income, minus
                your budgets, minus anything spent without a budget or over
                budget. If it goes below zero, you&apos;ve planned or spent
                more than you have.
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="font-medium">Whole cycle or per day?</dt>
              <dd className="text-muted-foreground leading-relaxed">
                Whole cycle suits spending that comes in chunks, like
                groceries or bills. Per day suits a set daily amount, like
                RM15 for lunch: pick the days, and the budget is that amount
                times the days you picked.
              </dd>
            </div>
          </dl>
          <DialogFooter>
            <Button onClick={() => setHelpOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
