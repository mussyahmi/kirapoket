"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PlusIcon, Trash2Icon, GripVerticalIcon, SparklesIcon, TagsIcon, CoffeeIcon, ListIcon, PencilIcon, InfoIcon, ChevronDownIcon } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSalaryCycleRange } from "@/lib/firestore";
import { type SpendingInsights } from "@/lib/gemini";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import SupportButton from "@/components/common/SupportButton";
import type { Category, ForecastIncomeItem } from "@/lib/types";

interface L3EditForm {
  name: string;
  budgetType: "cycle" | "daily";
  budget: string;
  budgetSelectedDates: Date[];
  note: string;
  links: string[];
}

const L1_COLORS: Record<string, string> = {
  needs: "#4ade80",
  wants: "#f97316",
  savings: "#60a5fa",
};

function effectiveCatBudget(c: Pick<Category, "budget" | "budgetType" | "budgetDays">) {
  if (c.budget === undefined) return 0;
  if (c.budgetType === "daily") return c.budget * (c.budgetDays ?? 30);
  return c.budget;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(n);


function SortableForecastItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-1"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        tabIndex={-1}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/20 hover:text-muted-foreground/60 shrink-0"
      >
        <GripVerticalIcon className="size-3" />
      </button>
      {children}
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

  const { user } = useAuth();

  const [mode, setMode] = useState<"actual" | "forecast">("actual");

  // Forecast income items (local draft, saved on change)
  const savedItems: ForecastIncomeItem[] = userProfile?.forecastIncomeItems ?? [];
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const [insights, setInsights] = useState<SpendingInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState<Date | null>(null);
  const [selectedL3, setSelectedL3] = useState<Category | null>(null);
  const [unbudgetedInfoOpen, setUnbudgetedInfoOpen] = useState(false);
  const [overBudgetInfoOpen, setOverBudgetInfoOpen] = useState(false);

  const [l3EditOpen, setL3EditOpen] = useState(false);
  const [l3EditTarget, setL3EditTarget] = useState<Category | null>(null);
  const [l3EditForm, setL3EditForm] = useState<L3EditForm>({ name: "", budgetType: "cycle", budget: "", budgetSelectedDates: [], note: "", links: [] });
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
      budgetSelectedDates: cat.budgetSelectedDates
        ? cat.budgetSelectedDates.map(s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); })
        : [],
      note: cat.note ?? "",
      links: cat.links ?? [],
    });
    setL3EditOpen(true);
  };

  const handleL3Save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l3EditTarget || !l3EditForm.name.trim()) return;
    const budget = l3EditForm.budget.trim() ? parseFloat(l3EditForm.budget) : undefined;
    if (l3EditForm.budget.trim() && (isNaN(budget!) || budget! < 0)) { toast.error("Invalid budget amount."); return; }
    const budgetType = l3EditForm.budget.trim() ? l3EditForm.budgetType : undefined;
    const budgetDays = budgetType === "daily" && l3EditForm.budgetSelectedDates.length > 0 ? l3EditForm.budgetSelectedDates.length : undefined;
    const budgetSelectedDates = budgetType === "daily" && l3EditForm.budgetSelectedDates.length > 0
      ? l3EditForm.budgetSelectedDates.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`) : undefined;
    setL3EditSaving(true);
    try {
      await editCategory(l3EditTarget.id, {
        name: l3EditForm.name.trim(),
        budget,
        budgetType,
        budgetDays,
        budgetSelectedDates,
        note: l3EditForm.note.trim() || undefined,
        links: l3EditForm.links.filter(l => l.trim()).length > 0 ? l3EditForm.links.filter(l => l.trim()) : undefined,
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
    await saveUserProfile({ forecastIncomeItems: savedItems.filter((i) => i.id !== id) });
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
        i.id === editingId ? { ...i, label: editLabel.trim(), amount } : i
      ),
    });
    setEditingId(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleReorderItems = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = savedItems.findIndex((i) => i.id === active.id);
    const newIndex = savedItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(savedItems, oldIndex, newIndex);
    await saveUserProfile({ forecastIncomeItems: reordered });
  };


  const salaryDay = userProfile?.salaryDay ?? 25;
  const cycleStarts = userProfile?.cycleStarts;
  const cycleOptions = { cycleStarts };

  const { start, end } = getSalaryCycleRange(salaryDay, new Date(), cycleOptions);
  const cycleLabel = `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;

  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  const cycleTransactions = useMemo(
    () => transactions.filter((t) => t.date >= startStr && t.date <= endStr),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, startStr, endStr]
  );

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const l2BudgetMap = useMemo(() => {
    const result: Record<string, number> = {};
    for (const c of categories) {
      if (c.level === 2) {
        result[c.id] = categories
          .filter((ch) => ch.level === 3 && ch.parentId === c.id)
          .reduce((s, ch) => s + effectiveCatBudget(ch), 0);
      }
    }
    return result;
  }, [categories]);

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
      while (cat && cat.level !== 2 && cat.parentId) cat = categoryMap[cat.parentId];
      if (cat?.level === 2) result[cat.id] = (result[cat.id] ?? 0) + t.amount;
    }
    return result;
  }, [cycleTransactions, categoryMap]);

  const actualIncome = useMemo(
    () => cycleTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [cycleTransactions]
  );

  const forecastIncome = useMemo(
    () => savedItems.reduce((s, i) => s + i.amount, 0),
    [savedItems]
  );

  const effectiveIncome = mode === "forecast" ? forecastIncome : actualIncome;

  const totalSpent = useMemo(
    () => cycleTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [cycleTransactions]
  );

  const totalBudgeted = useMemo(
    () => Object.values(l2BudgetMap).reduce((s, v) => s + v, 0),
    [l2BudgetMap]
  );

  const unbudgetedSpending = useMemo(() => {
    return cycleTransactions
      .filter((t) => t.type === "expense" && t.categoryId)
      .reduce((s, t) => {
        const cat = categoryMap[t.categoryId!];
        if (!cat) return s + t.amount;
        if (cat.level === 3) return effectiveCatBudget(cat) === 0 ? s + t.amount : s;
        if (cat.level === 2) return (l2BudgetMap[cat.id] ?? 0) === 0 ? s + t.amount : s;
        return s;
      }, 0);
  }, [cycleTransactions, categoryMap, l2BudgetMap]);

  const totalExceedAmount = useMemo(() => {
    return categories
      .filter((c) => c.level === 3)
      .reduce((s, c) => {
        const budget = effectiveCatBudget(c);
        if (budget <= 0) return s;
        const spent = l3SpendingMap[c.id] ?? 0;
        return spent > budget ? s + (spent - budget) : s;
      }, 0);
  }, [categories, l3SpendingMap]);

  const unallocated = effectiveIncome - totalBudgeted - unbudgetedSpending - totalExceedAmount;
  const actualRemaining = effectiveIncome - totalSpent;

  const l1Categories = useMemo(() => {
    const order: Record<string, number> = { needs: 0, wants: 1, savings: 2 };
    return categories
      .filter((c) => c.level === 1)
      .sort((a, b) => (order[a.type ?? ""] ?? 9) - (order[b.type ?? ""] ?? 9));
  }, [categories]);

  const hasBudgets = useMemo(
    () => Object.values(l2BudgetMap).some((v) => v > 0),
    [l2BudgetMap]
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
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">

      <div>
        <h1 className="text-xl font-semibold">Budget</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{cycleLabel}</p>
      </div>

      {/* AI Insights */}
      <div className="rounded-xl border border-amber-200/60 dark:border-amber-700/40 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-b border-amber-100 dark:border-amber-800/40">
          <div className="flex items-center gap-2">
            <SparklesIcon className={cn("size-4 text-amber-500 dark:text-amber-400 shrink-0", insightsLoading && "animate-pulse")} />
            <div>
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">AI Insights</span>
              {insightsGeneratedAt && !insightsLoading && (
                <p className="text-[10px] text-amber-500/70 dark:text-amber-500/60 leading-none mt-0.5">
                  {insightsGeneratedAt.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                  {" · "}
                  {insightsGeneratedAt.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}

            </div>
          </div>
          {!insights && !insightsLoading && (
            <>
              <button
                onClick={() => setSupportOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors" style={{ backgroundColor: "#FFDD00", color: "#1a1a1a" }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f5d000")} onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#FFDD00")}
              >
                <CoffeeIcon className="size-3.5 shrink-0" /> Buy Me a Coffee
              </button>
              <SupportButton dialogOnly open={supportOpen} onOpenChange={setSupportOpen} />
            </>
          )}
        </div>
        <div className="p-4 bg-card space-y-4">
          {insightsLoading ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-5/6" />
                <Skeleton className="h-3.5 w-4/6" />
              </div>
              <div className="space-y-1.5 pt-3 border-t border-border/50">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-11/12" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
              <div className="space-y-1.5 pt-3 border-t border-border/50">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-10/12" />
                <Skeleton className="h-3.5 w-3/5" />
              </div>
            </div>
          ) : !insights ? (
            <div className="space-y-2 py-2">
              <p className="text-sm text-foreground/80 leading-relaxed">
                AI Insights is temporarily unavailable and will be back on <span className="font-semibold text-amber-500 dark:text-amber-400">29 June 2026</span>. Sorry for the inconvenience!
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you&apos;d like to help keep this feature running, you&apos;re welcome to buy me a coffee — every bit helps!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-foreground/80 border-l-2 border-amber-300 dark:border-amber-600 pl-3">{insights.summary}</p>
              <div className="space-y-2.5 pt-1 border-t border-border/50">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold">
                  <span className="size-1.5 rounded-full bg-green-500 shrink-0" />Do
                </span>
                <ul className="space-y-2.5">
                  {insights.dos.map((tip, i) => (
                    <li key={i} className="flex gap-2.5 text-sm">
                      <span className="size-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✓</span>
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2.5 pt-1 border-t border-border/50">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold">
                  <span className="size-1.5 rounded-full bg-red-500 shrink-0" />Don&apos;t
                </span>
                <ul className="space-y-2.5">
                  {insights.donts.map((tip, i) => (
                    <li key={i} className="flex gap-2.5 text-sm">
                      <span className="size-5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✕</span>
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">

        {/* Forecast Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Summary</CardTitle>
              <div className="flex items-center gap-1">
                {/* Toggle */}
                <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                  {(["actual", "forecast"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cn(
                        "px-3 py-1.5 capitalize transition-colors",
                        mode === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {/* Income display */}
            {mode === "actual" ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Income</span>
                <span className="font-medium tabular-nums text-green-600 dark:text-green-400">{fmt(actualIncome)}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expected income</span>
                  <span className="font-medium tabular-nums text-green-600 dark:text-green-400">{fmt(forecastIncome)}</span>
                </div>
                {/* Saved items */}
                {savedItems.length > 0 && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorderItems}>
                    <SortableContext items={savedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5 pl-1 border-l-2 border-border">
                        {savedItems.map((item) =>
                          editingId === item.id ? (
                            <div key={item.id} className="flex gap-1.5 items-center pl-4">
                              <Input
                                autoFocus
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="flex-1 h-7 text-xs"
                                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                              />
                              <Input
                                type="number"
                                inputMode="decimal"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-24 h-7 text-xs"
                                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                              />
                              <button type="button" onClick={handleSaveEdit} className="text-xs font-medium text-primary shrink-0">Save</button>
                              <button type="button" onClick={() => setEditingId(null)} className="text-xs text-muted-foreground shrink-0">Cancel</button>
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
                                    className="amt tabular-nums text-green-600 dark:text-green-400 hover:underline"
                                  >
                                    {fmt(item.amount)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="text-muted-foreground/50 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2Icon className="size-3" />
                                  </button>
                                </div>
                              </div>
                            </SortableForecastItem>
                          )
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
                {/* Add new item */}
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Salary, KWSP"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="flex-1 h-8 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  />
                  <Input
                    placeholder="Amount"
                    type="number"
                    inputMode="decimal"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-28 h-8 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  />
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleAddItem} disabled={saving}>
                    <PlusIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Allocation section */}
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <div className="px-3 py-1.5 bg-muted/40 border-b border-border/40">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60">Allocation</span>
              </div>
              <div className="px-3 py-2.5 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total budgeted</span>
                  <span className="font-medium amt tabular-nums text-muted-foreground"><span className="text-foreground/40">−</span> {fmt(totalBudgeted)}</span>
                </div>
                {unbudgetedSpending > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => setUnbudgetedInfoOpen((v) => !v)}
                        className="flex items-center gap-1 text-orange-500/80 hover:text-orange-500 transition-colors"
                      >
                        Unbudgeted spending
                        <InfoIcon className="size-3 shrink-0" />
                      </button>
                      <span className="font-medium tabular-nums text-orange-500"><span className="text-orange-400/60">−</span> {fmt(unbudgetedSpending)}</span>
                    </div>
                    {unbudgetedInfoOpen && (
                      <p className="text-[11px] text-orange-500/70 leading-snug pl-3 border-l-2 border-orange-300/60 dark:border-orange-700/60">
                        Spending on categories that have no budget set.
                      </p>
                    )}
                  </div>
                )}
                {totalExceedAmount > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => setOverBudgetInfoOpen((v) => !v)}
                        className="flex items-center gap-1 text-red-500/80 hover:text-red-500 transition-colors"
                      >
                        Over-budget spending
                        <InfoIcon className="size-3 shrink-0" />
                      </button>
                      <span className="font-medium tabular-nums text-red-500"><span className="text-red-400/60">−</span> {fmt(totalExceedAmount)}</span>
                    </div>
                    {overBudgetInfoOpen && (
                      <p className="text-[11px] text-red-500/70 leading-snug pl-3 border-l-2 border-red-300/60 dark:border-red-700/60">
                        Spending that exceeded category budgets.
                      </p>
                    )}
                  </div>
                )}
                <div className={cn(
                  "flex justify-between text-sm font-semibold rounded-lg py-2 border-t border-dashed border-border/60 pt-2.5 mt-0.5"
                )}>
                  <span className={cn(unallocated < 0 ? "text-red-500" : "text-blue-500 dark:text-blue-400")}>Unallocated</span>
                  <span className={cn("amt tabular-nums", unallocated < 0 ? "text-red-500" : "text-blue-500 dark:text-blue-400")}>
                    {fmt(unallocated)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actuals section */}
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <div className="px-3 py-1.5 bg-muted/40 border-b border-border/40">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60">Actuals</span>
              </div>
              <div className="px-3 py-2.5 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spent so far</span>
                  <span className="font-medium amt tabular-nums text-red-500 dark:text-red-400">{fmt(totalSpent)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Remaining</span>
                  <span className={cn("amt tabular-nums", actualRemaining < 0 ? "text-red-500" : "text-green-500 dark:text-green-400")}>
                    {fmt(actualRemaining)}
                  </span>
                </div>
                {effectiveIncome > 0 && (
                  <div className="space-y-1.5">
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", actualRemaining < 0 ? "bg-red-500" : "bg-green-500 dark:bg-green-400")}
                        style={{ width: `${Math.min((totalSpent / effectiveIncome) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground/60 tabular-nums">
                      <span>{Math.round((totalSpent / effectiveIncome) * 100)}% spent</span>
                      <span>{Math.max(0, Math.round((actualRemaining / effectiveIncome) * 100))}% left</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Budgets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>By Category</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => router.push("/categories")}
                aria-label="Go to categories"
              >
                <TagsIcon className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!hasBudgets ? (
              <p className="text-sm text-muted-foreground">
                No budgets set. Add budgets from the{" "}
                <a href="/categories" className="underline text-foreground">Categories</a> page.
              </p>
            ) : (
              l1Categories.map((l1) => {
                const l2s = categories
                  .filter((c) => c.level === 2 && c.parentId === l1.id)
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

                const l2sVisible = l2s.filter(
                  (l2) => (l2BudgetMap[l2.id] ?? 0) > 0 || (l2SpendingMap[l2.id] ?? 0) > 0
                );
                if (l2sVisible.length === 0) return null;

                const color = L1_COLORS[l1.type ?? ""] ?? "#94a3b8";
                const isExpanded = effectiveExpanded.has(l1.id);
                const l1spent = l2sVisible.reduce((s, l2) => s + (l2SpendingMap[l2.id] ?? 0), 0);
                const l1budget = l2sVisible.reduce((s, l2) => s + (l2BudgetMap[l2.id] ?? 0), 0);
                const l1over = l1budget > 0 && l1spent > l1budget;
                return (
                  <div key={l1.id} className="space-y-3">
                    {/* L1 header */}
                    <button
                      type="button"
                      onClick={() => toggleL1(l1.id)}
                      aria-label={isExpanded ? `Collapse ${l1.name}` : `Expand ${l1.name}`}
                      className="flex w-full items-center justify-between gap-2 rounded-sm px-1 -mx-1 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDownIcon className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", !isExpanded && "-rotate-90")} />
                        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <p className="text-sm font-bold">{l1.name}</p>
                      </div>
                      <span className={cn("amt tabular-nums text-xs shrink-0", l1over ? "text-red-500" : "text-muted-foreground")}>
                        {fmt(l1spent)}
                        {l1budget > 0 && <span className="amt text-muted-foreground/50"> / {fmt(l1budget)}</span>}
                      </span>
                    </button>

                    {/* L2 rows */}
                    {isExpanded && (
                    <div className="space-y-3 pl-4 border-l-2" style={{ borderColor: color + "66" }}>
                      {l2sVisible.map((l2) => {
                        const l2budget = l2BudgetMap[l2.id] ?? 0;
                        const l2spent = l2SpendingMap[l2.id] ?? 0;

                        const l3s = categories
                          .filter((c) => c.level === 3 && c.parentId === l2.id)
                          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

                        const l2budgetedSpent = l3s.reduce((s, l3) => effectiveCatBudget(l3) > 0 ? s + (l3SpendingMap[l3.id] ?? 0) : s, 0);
                        const l2remaining = l2budget - l2budgetedSpent;
                        const l2pct = l2budget > 0 ? Math.min((l2budgetedSpent / l2budget) * 100, 100) : null;
                        const l2over = l2budget > 0 && l2budgetedSpent > l2budget;
                        const l3sVisible = l3s.filter(
                          (l3) => effectiveCatBudget(l3) > 0 || (l3SpendingMap[l3.id] ?? 0) > 0
                        );

                        return (
                          <div key={l2.id} className="space-y-1.5">
                            {/* L2 name + amounts */}
                            <button
                              type="button"
                              onClick={() => router.push(`/transactions?category=${l2.id}&from=${startStr}&to=${endStr}`)}
                              className="flex items-center justify-between gap-2 text-sm rounded-sm px-1 -mx-1 hover:bg-muted/50 transition-colors w-full"
                            >
                              <span className={cn("font-medium text-left", l2budget > 0 && !l2over && l2remaining === 0 && "line-through text-muted-foreground")}>
                                {l2.name}
                              </span>
                              <span className={cn("amt tabular-nums shrink-0 text-xs", l2over ? "text-red-500" : "text-muted-foreground")}>
                                {fmt(l2spent)}
                                {l2budget > 0 && <span className="amt text-muted-foreground/50"> / {fmt(l2budget)}</span>}
                              </span>
                            </button>
                            {/* Progress bar + remaining inline */}
                            {l2pct !== null && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${l2pct}%`, backgroundColor: l2over ? "#ef4444" : color }}
                                  />
                                </div>
                                <span className={cn("text-[10px] tabular-nums amt shrink-0 w-20 text-right", l2over ? "text-red-500" : "text-muted-foreground/60")}>
                                  {l2over ? `Over ${fmt(Math.abs(l2remaining))}` : `${fmt(l2remaining)} left`}
                                </span>
                              </div>
                            )}
                            {/* L3 rows */}
                            {l3sVisible.length > 0 && (
                              <div className="space-y-1 pt-0.5 pl-3 border-l border-border/40">
                                {l3sVisible.map((l3) => {
                                  const l3budget = effectiveCatBudget(l3);
                                  const l3spent = l3SpendingMap[l3.id] ?? 0;
                                  const l3remaining = l3budget - l3spent;
                                  const l3over = l3budget > 0 && l3spent > l3budget;

                                  return (
                                    <button
                                      key={l3.id}
                                      type="button"
                                      onClick={() => setSelectedL3(l3)}
                                      className="flex items-center justify-between gap-2 text-xs rounded-sm px-1 -mx-1 hover:bg-muted/50 transition-colors w-full"
                                    >
                                      <span className={cn("text-muted-foreground/80 text-left hover:text-muted-foreground", !l3over && l3remaining === 0 && "line-through")}>
                                        {l3.name}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={cn("amt tabular-nums", l3over ? "text-red-500" : "text-muted-foreground")}>
                                          {fmt(l3spent)}
                                          {l3budget > 0 && <span className="amt text-muted-foreground/50"> / {fmt(l3budget)}</span>}
                                        </span>
                                        {l3budget > 0 && (
                                          <span className={cn("text-[10px] amt tabular-nums", l3over ? "text-red-400" : "text-muted-foreground/50")}>
                                            ({l3over ? `-${fmt(Math.abs(l3remaining))}` : `${fmt(l3remaining)} left`})
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
        const l3budget = effectiveCatBudget(l3);
        const l3spent = l3SpendingMap[l3.id] ?? 0;
        const l3over = l3budget > 0 && l3spent > l3budget;
        const l1 = categories.find((c) => {
          const l2 = categories.find((x) => x.id === l3.parentId);
          return l2 && c.id === l2.parentId;
        });
        const color = L1_COLORS[l1?.type ?? ""] ?? "#94a3b8";
        return (
          <Dialog open={!!selectedL3} onOpenChange={(open) => { if (!open) setSelectedL3(null); }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {l3.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {l3budget > 0 && (
                  <div className="rounded-xl px-4 py-3 flex items-center justify-between bg-muted/50">
                    <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Budget</p>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{fmt(l3budget)}</p>
                      {l3.budgetType === "daily" && l3.budget !== undefined && l3.budgetDays && (
                        <p className="text-xs text-muted-foreground">{fmt(l3.budget)}/day × {l3.budgetDays} days</p>
                      )}
                    </div>
                  </div>
                )}
                {l3spent > 0 && (
                  <div className={cn("rounded-xl px-4 py-3 flex items-center justify-between", l3over ? "bg-red-50 dark:bg-red-950/30" : "bg-green-50 dark:bg-green-950/30")}>
                    <p className={cn("text-xs font-semibold tracking-widest uppercase", l3over ? "text-red-500" : "text-green-600 dark:text-green-400")}>Spent</p>
                    <p className={cn("text-lg font-bold", l3over ? "text-red-500" : "text-green-600 dark:text-green-400")}>{fmt(l3spent)}</p>
                  </div>
                )}
                {l3.note && (
                  <div className="rounded-xl px-4 py-3 bg-muted/50 space-y-1">
                    <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Note</p>
                    <p className="text-sm whitespace-pre-wrap">{l3.note}</p>
                  </div>
                )}
                {l3.links && l3.links.length > 0 && (
                  <div className="rounded-xl px-4 py-3 bg-muted/50 space-y-1.5">
                    <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Links</p>
                    {l3.links.map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary underline truncate">{link}</a>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" className="flex-1 gap-1.5" onClick={() => { setSelectedL3(null); router.push(`/transactions?category=${l3.id}&from=${startStr}&to=${endStr}`); }}>
                    <ListIcon className="size-3.5" /> Transactions
                  </Button>
                  {!isReadOnly && (
                    <Button variant="outline" className="flex-1 gap-1.5" onClick={() => openL3Edit(l3)}>
                      <PencilIcon className="size-3.5" /> Edit
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
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleL3Save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="l3-name">Name</Label>
              <Input
                id="l3-name"
                value={l3EditForm.name}
                onChange={(e) => setL3EditForm({ ...l3EditForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Budget (optional)</Label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(["cycle", "daily"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setL3EditForm({ ...l3EditForm, budgetType: t })}
                      className={cn(
                        "flex-1 py-1.5 text-sm font-medium transition-colors",
                        l3EditForm.budgetType === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {t === "cycle" ? "Per Cycle" : "Per Day"}
                    </button>
                  ))}
                </div>
              </div>
              {l3EditForm.budgetType === "cycle" ? (
                <div className="space-y-1.5">
                  <Label>Amount (MYR)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={l3EditForm.budget}
                    onChange={(e) => setL3EditForm({ ...l3EditForm, budget: e.target.value })}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label>Amount / day (MYR)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={l3EditForm.budget}
                      onChange={(e) => setL3EditForm({ ...l3EditForm, budget: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 mt-4">
                    <div className="flex items-center justify-between">
                      <Label>Select days this cycle</Label>
                      {l3EditForm.budgetSelectedDates.length > 0 && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                          onClick={() => setL3EditForm({ ...l3EditForm, budgetSelectedDates: [] })}
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="rounded-xl border border-border min-h-[420px] bg-background overflow-hidden">
                      <Calendar
                        mode="multiple"
                        selected={l3EditForm.budgetSelectedDates}
                        onSelect={(dates: Date[] | undefined) => setL3EditForm({ ...l3EditForm, budgetSelectedDates: dates ?? [] })}
                        className="w-full"
                      />
                    </div>
                  </div>
                  {l3EditForm.budget && parseFloat(l3EditForm.budget) > 0 && l3EditForm.budgetSelectedDates.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                      <span className="text-xs text-muted-foreground">{l3EditForm.budgetSelectedDates.length} days selected</span>
                      <span className="text-sm font-semibold">RM {(parseFloat(l3EditForm.budget) * l3EditForm.budgetSelectedDates.length).toLocaleString("ms-MY", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l3-note">Note (optional)</Label>
              <Textarea
                id="l3-note"
                placeholder="Add a note..."
                rows={3}
                value={l3EditForm.note}
                onChange={(e) => setL3EditForm({ ...l3EditForm, note: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
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
                    <Button type="button" variant="ghost" size="icon" onClick={() => setL3EditForm({ ...l3EditForm, links: l3EditForm.links.filter((_, j) => j !== i) })}>
                      <Trash2Icon className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setL3EditForm({ ...l3EditForm, links: [...l3EditForm.links, ""] })}>
                  <PlusIcon className="size-4 mr-1.5" /> Add link
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setL3EditOpen(false)} disabled={l3EditSaving}>Cancel</Button>
              <Button type="submit" disabled={l3EditSaving}>{l3EditSaving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
