"use client";

import { useMemo, useState, useRef } from "react";
import { format } from "date-fns";
import { toPng } from "html-to-image";
import { CopyIcon, CheckIcon, PlusIcon, Trash2Icon, XIcon, DownloadIcon, EyeOffIcon, EyeIcon, GripVerticalIcon } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { getSalaryCycleRange } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Category, ForecastIncomeItem } from "@/lib/types";

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

const CENSORED = "RM ••••";

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
  const {
    userProfile,
    categories,
    transactions,
    loadingTransactions,
    loadingProfile,
    saveUserProfile,
  } = useApp();

  const [mode, setMode] = useState<"actual" | "forecast">("actual");
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [censored, setCensored] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  // Forecast income items (local draft, saved on change)
  const savedItems: ForecastIncomeItem[] = userProfile?.forecastIncomeItems ?? [];
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const fmtAmt = (n: number) => censored ? CENSORED : fmt(n);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");

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

  const handleCopy = async () => {
    if (!captureRef.current) return;
    setCopying(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });

      // Desktop: try clipboard API (stays in gesture context on Chrome/Edge)
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (!isIos && navigator.clipboard?.write) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setCopied(true);
          toast.success("Copied! Paste anywhere to share.");
          setTimeout(() => setCopied(false), 2000);
          return;
        } catch {
          // Fall through to preview modal
        }
      }

      // iOS / fallback: show image preview — long-press to copy/save
      setPreviewUrl(dataUrl);
    } catch {
      toast.error("Failed to generate image.");
    } finally {
      setCopying(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.download = "kirapoket-budget.png";
    link.href = previewUrl;
    link.click();
  };

  const salaryDay = userProfile?.salaryDay ?? 25;
  const graceDays = userProfile?.salaryGraceDays ?? 0;
  const manualCycleStart = userProfile?.manualCycleStart;
  const cycleOptions = { graceDays, manualCycleStart };

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

  const unallocated = effectiveIncome - totalBudgeted - unbudgetedSpending;
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

  const loading = loadingTransactions || loadingProfile;

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Budget</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{cycleLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCensored((v) => !v)}
            aria-label={censored ? "Show amounts" : "Hide amounts"}
          >
            {censored
              ? <EyeOffIcon className="size-4 text-muted-foreground" />
              : <EyeIcon className="size-4 text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleCopy} disabled={copying} aria-label="Copy as image">
            {copied
              ? <CheckIcon className="size-4 text-green-500" />
              : <CopyIcon className={cn("size-4 text-muted-foreground", copying && "animate-pulse")} />}
          </Button>
        </div>
      </div>

      <div ref={captureRef} className={cn("space-y-6 bg-background rounded-xl p-1", censored && "[&_.amt]:!text-muted-foreground")}>

        {/* Forecast Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Income</CardTitle>
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
          </CardHeader>
          <CardContent className="space-y-2.5">
            {/* Income display */}
            {mode === "actual" ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Income</span>
                <span className={cn("font-medium amt tabular-nums", censored ? "text-muted-foreground" : "text-green-600 dark:text-green-400")}>{fmtAmt(actualIncome)}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expected income</span>
                  <span className={cn("font-medium tabular-nums", censored ? "text-muted-foreground" : "text-green-600 dark:text-green-400")}>{fmtAmt(forecastIncome)}</span>
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
                                    {fmtAmt(item.amount)}
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

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total budgeted</span>
              <span className="font-medium amt tabular-nums text-muted-foreground"><span className="text-foreground/40">−</span> {fmtAmt(totalBudgeted)}</span>
            </div>
            {unbudgetedSpending > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-orange-500/80">Unbudgeted spending</span>
                <span className="font-medium amt tabular-nums text-orange-500"><span className={censored ? "text-foreground/40" : "text-orange-400/60"}>−</span> {fmtAmt(unbudgetedSpending)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t font-semibold">
              <span>Unallocated</span>
              <span className={cn("amt tabular-nums", unallocated < 0 ? "text-red-500" : "text-blue-500 dark:text-blue-400")}>
                {fmtAmt(unallocated)}
              </span>
            </div>

            <div className="pt-2 border-t space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Spent so far</span>
                <span className="font-medium amt tabular-nums text-red-500 dark:text-red-400">{fmtAmt(totalSpent)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Remaining</span>
                <span className={cn("amt tabular-nums", actualRemaining < 0 ? "text-red-500" : "text-green-500 dark:text-green-400")}>
                  {fmtAmt(actualRemaining)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Budgets */}
        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
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

                return (
                  <div key={l1.id} className="space-y-3">
                    {/* L1 header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <p className="text-sm font-bold">{l1.name}</p>
                      </div>
                    </div>

                    {/* L2 rows */}
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
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className={cn("font-medium", l2budget > 0 && !l2over && l2remaining === 0 && "line-through text-muted-foreground")}>{l2.name}</span>
                              <span className={cn("amt tabular-nums shrink-0 text-xs", l2over ? "text-red-500" : "text-muted-foreground")}>
                                {fmtAmt(l2spent)}
                                {l2budget > 0 && <span className="amt text-muted-foreground/50"> / {fmtAmt(l2budget)}</span>}
                              </span>
                            </div>
                            {/* Progress bar + remaining inline */}
                            {l2pct !== null && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${l2pct}%`, backgroundColor: l2over ? "#ef4444" : color }}
                                  />
                                </div>
                                <span className={cn("text-[10px] tabular-nums amt shrink-0 w-20 text-right", l2over ? "text-red-500" : "text-muted-foreground/60")}>
                                  {l2over ? `Over ${fmtAmt(Math.abs(l2remaining))}` : `${fmtAmt(l2remaining)} left`}
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
                                    <div key={l3.id} className="flex items-center justify-between gap-2 text-xs">
                                      <span className={cn("text-muted-foreground/80", !l3over && l3remaining === 0 && "line-through")}>{l3.name}</span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={cn("amt tabular-nums", l3over ? "text-red-500" : "text-muted-foreground")}>
                                          {fmtAmt(l3spent)}
                                          {l3budget > 0 && <span className="amt text-muted-foreground/50"> / {fmtAmt(l3budget)}</span>}
                                        </span>
                                        {l3budget > 0 && (
                                          <span className={cn("text-[10px] amt tabular-nums", l3over ? "text-red-400" : "text-muted-foreground/50")}>
                                            ({l3over ? `-${fmtAmt(Math.abs(l3remaining))}` : `${fmtAmt(l3remaining)} left`})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image preview modal (iOS long-press to copy/save) */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4 gap-4"
          onClick={() => setPreviewUrl(null)}
        >
          <p className="text-white text-sm font-medium">Long-press the image to copy or save</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Budget snapshot"
            className="max-w-full max-h-[70vh] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            >
              <DownloadIcon className="size-3.5" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-white hover:bg-white/20 gap-1.5"
              onClick={() => setPreviewUrl(null)}
            >
              <XIcon className="size-3.5" />
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
