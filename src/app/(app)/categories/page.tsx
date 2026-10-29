"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  PlusIcon,
  TagIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  GripVerticalIcon,
  ListIcon,
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
import { CategoryDetailFields } from "@/components/categories/CategoryDetailFields";
import { CategoryDetailRows } from "@/components/categories/CategoryDetailRows";
import { isOwnExpense } from "@/lib/income";
import { format } from "date-fns";
import { useCurrentCycle } from "@/hooks/useCurrentCycle";
import {
  effectiveCatBudget,
  countWeekdays,
  initialWeekdays,
  type CycleRange,
} from "@/lib/budget";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LoadError } from "@/components/common/Skeletons";
import { L1_PILL, L1_DOT_CLASS, l1Color, tint } from "@/lib/palette";
import type { Category } from "@/lib/types";

type L1Type = "needs" | "wants" | "savings";

const PROTECTED_L2_NAMES = ["Debt Repayment", "Money Lent"];
// Items under these L2 categories are created automatically from the Debts flow,
// so manual"Add item" is not offered.
const AUTO_ITEM_L2_NAMES = ["Money Lent"];

const L1_COLORS = L1_PILL;
const L1_DOT = L1_DOT_CLASS;

interface CategoryFormData {
  name: string;
  budgetType: "cycle" | "daily";
  budget: string;
  budgetWeekdays: number[];
  dueDay: string;
  note: string;
  links: string[];
  color: string;
}

const DEFAULT_FORM: CategoryFormData = {
  name: "",
  budgetType: "cycle",
  budget: "",
  // Per day defaults to every day; the picker's presets narrow it
  budgetWeekdays: [0, 1, 2, 3, 4, 5, 6],
  dueDay: "",
  note: "",
  links: [],
  color: "",
};

// ─── L3Item ───────────────────────────────────────────────────────────────────

interface L3ItemProps {
  item: Category;
  l1Type: L1Type;
  /** This cycle's spend, so the detail panel can show it beside the budget. */
  spent?: number;
  openEdit: (cat: Category) => void;
  setDeleteTarget: (cat: Category) => void;
  readOnly?: boolean;
}

function fmtItemBudget(c: Category, cycle: CycleRange): string | null {
  if (c.budget === undefined) return null;
  const total = effectiveCatBudget(c, cycle).toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
  });
  return `· RM ${total}`;
}

function L3Item({
  item,
  l1Type,
  spent,
  openEdit,
  setDeleteTarget,
  readOnly,
}: L3ItemProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const cycle = useCurrentCycle();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.4 : 1,
        }}
        className="flex items-center gap-1 py-2 pr-2 hover:bg-muted/50 rounded-lg group"
      >
        {!readOnly && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            tabIndex={-1}
            aria-label="Drag to reorder"
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/70 hover:text-foreground shrink-0 px-1"
          >
            <GripVerticalIcon className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex-1 text-sm text-muted-foreground truncate flex items-center gap-2 min-w-0 text-left"
        >
          <span className="truncate">{item.name}</span>
          {fmtItemBudget(item, cycle) && (
            <span className="text-xs shrink-0 text-muted-foreground">
              {fmtItemBudget(item, cycle)}
            </span>
          )}
        </button>
        {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center size-6 pointer-coarse:size-9 rounded-lg text-muted-foreground opacity-50 hover:opacity-100 hover:bg-accent transition-colors shrink-0">
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => openEdit(item)}>
                <PencilIcon className="size-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(item)}
              >
                <TrashIcon className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className={cn("size-2.5 rounded-full shrink-0", L1_DOT[l1Type])}
              />
              {item.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <CategoryDetailRows category={item} cycle={cycle} spent={spent} />
            <div className="flex gap-2 pt-1">
              <Link
                href={`/transactions?category=${item.id}`}
                className="flex-1"
                onClick={() => setPreviewOpen(false)}
              >
                <Button variant="outline" className="w-full gap-2">
                  <ListIcon /> Transactions
                </Button>
              </Link>
              {!readOnly && (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setPreviewOpen(false);
                      openEdit(item);
                    }}
                  >
                    <PencilIcon /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => {
                      setPreviewOpen(false);
                      setDeleteTarget(item);
                    }}
                  >
                    <TrashIcon />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── L2Row ───────────────────────────────────────────────────────────────────

interface L2RowProps {
  cat: Category;
  l1Type: L1Type;
  l3: Category[];
  spentOf: (id: string) => number;
  isOpen: boolean;
  subtotal: number;
  isProtected: boolean;
  fmtBudget: (n: number) => string;
  toggleExpand: (id: string) => void;
  onDragEnd: (e: DragEndEvent, siblings: { id: string }[]) => void;
  openCreate: (
    level: 1 | 2 | 3,
    parentId: string | null,
    type?: L1Type,
  ) => void;
  openEdit: (cat: Category) => void;
  setDeleteTarget: (cat: Category) => void;
  readOnly?: boolean;
}

function L2Row({
  cat,
  l1Type,
  l3,
  spentOf,
  isOpen,
  subtotal,
  isProtected,
  fmtBudget,
  toggleExpand,
  onDragEnd,
  openCreate,
  openEdit,
  setDeleteTarget,
  readOnly,
}: L2RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const canAddItem = !AUTO_ITEM_L2_NAMES.includes(cat.name);
  const hasMenu = canAddItem || !isProtected;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div className="flex items-center gap-1 py-2 pl-2 pr-2 hover:bg-muted/50 rounded-lg group">
        {!readOnly && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            tabIndex={-1}
            aria-label="Drag to reorder"
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/70 hover:text-foreground shrink-0 px-1"
          >
            <GripVerticalIcon className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => toggleExpand(cat.id)}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
        >
          <span
            className={cn("size-1.5 rounded-full shrink-0", L1_DOT[l1Type])}
          />
          {l3.length > 0 ? (
            isOpen ? (
              <ChevronDownIcon className="size-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRightIcon className="size-3.5 text-muted-foreground shrink-0" />
            )
          ) : (
            <span className="size-3.5 shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{cat.name}</span>
          {subtotal > 0 && (
            <span className="text-xs text-muted-foreground italic shrink-0">
              {fmtBudget(subtotal)}
            </span>
          )}
        </button>
        {!readOnly && hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center size-6 pointer-coarse:size-9 rounded-lg text-muted-foreground opacity-50 hover:opacity-100 hover:bg-accent transition-colors shrink-0">
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {canAddItem && (
                <DropdownMenuItem onClick={() => openCreate(3, cat.id, l1Type)}>
                  <PlusIcon className="size-3.5 mr-2" /> Add item
                </DropdownMenuItem>
              )}
              {!isProtected && (
                <>
                  <DropdownMenuItem onClick={() => openEdit(cat)}>
                    <PencilIcon className="size-3.5 mr-2" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget(cat)}
                  >
                    <TrashIcon className="size-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isOpen && l3.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => onDragEnd(e, l3)}
        >
          <SortableContext
            items={l3.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div
              className="ml-8 pl-3 space-y-0.5 border-l-2 my-1"
              style={{ borderColor: tint(l1Color(l1Type), 40) }}
            >
              {l3.map((item) => (
                <L3Item
                  key={item.id}
                  item={item}
                  l1Type={l1Type}
                  spent={spentOf(item.id)}
                  openEdit={openEdit}
                  setDeleteTarget={setDeleteTarget}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const {
    categories,
    transactions,
    loadingCategories,
    createCategory,
    editCategory,
    removeCategory,
    reorderCategoryItems,
    isViewingPartner,
    isImpersonating,
    loadError,
    refreshCategories,
  } = useApp();
  const isReadOnly = isViewingPartner || isImpersonating;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormData>(DEFAULT_FORM);
  const [dialogContext, setDialogContext] = useState<{
    level: 1 | 2 | 3;
    parentId: string | null;
    type?: L1Type;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const l1Categories = useMemo(() => {
    const order: Record<string, number> = { needs: 0, wants: 1, savings: 2 };
    return categories
      .filter((c) => c.level === 1)
      .sort((a, b) => (order[a.type ?? ""] ?? 9) - (order[b.type ?? ""] ?? 9));
  }, [categories]);

  const childrenOf = (parentId: string, level: 2 | 3) =>
    categories
      .filter((c) => c.level === level && c.parentId === parentId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const cycle = useCurrentCycle();
  const effectiveBudget = (c: Category): number => effectiveCatBudget(c, cycle);

  // This cycle's spend per level-3 category, so a category's detail panel can
  // show what has gone through it, the same as the Budget page does.
  const spentByL3 = useMemo(() => {
    const from = format(cycle.start, "yyyy-MM-dd");
    const to = format(cycle.end, "yyyy-MM-dd");
    const out: Record<string, number> = {};
    for (const t of transactions) {
      if (!isOwnExpense(t) || !t.categoryId) continue;
      if (t.date < from || t.date > to) continue;
      out[t.categoryId] = (out[t.categoryId] ?? 0) + t.amount;
    }
    return out;
  }, [transactions, cycle]);
  const spentOf = (id: string) => spentByL3[id] ?? 0;

  const l2Subtotal = (l2Id: string): number =>
    categories
      .filter((c) => c.level === 3 && c.parentId === l2Id)
      .reduce((sum, c) => sum + effectiveBudget(c), 0);

  const l1Subtotal = (l1Id: string): number =>
    categories
      .filter((c) => c.level === 2 && c.parentId === l1Id)
      .reduce((sum, c) => sum + l2Subtotal(c.id), 0);

  const fmtBudget = (n: number) =>
    `· RM ${n.toLocaleString("ms-MY", { minimumFractionDigits: 2 })}`;

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleDragEnd = async (
    event: DragEndEvent,
    siblings: { id: string }[],
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = siblings.findIndex((c) => c.id === active.id);
    const newIndex = siblings.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(siblings, oldIndex, newIndex);
    try {
      await reorderCategoryItems(reordered.map((c) => c.id));
    } catch {
      toast.error("Failed to reorder.");
    }
  };

  const openCreate = (
    level: 1 | 2 | 3,
    parentId: string | null,
    type?: L1Type,
  ) => {
    if (isReadOnly) return;
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setDialogContext({ level, parentId, type });
    setDialogOpen(true);
  };

  const guardedSetDeleteTarget = (cat: Category) => {
    if (isReadOnly) return;
    setDeleteTarget(cat);
  };

  const openEdit = (cat: Category) => {
    if (isReadOnly) return;
    setEditTarget(cat);
    setForm({
      name: cat.name,
      budgetType: cat.budgetType ?? "cycle",
      budget: cat.budget !== undefined ? String(cat.budget) : "",
      budgetWeekdays: initialWeekdays(cat),
      dueDay: cat.dueDay !== undefined ? String(cat.dueDay) : "",
      note: cat.note ?? "",
      links: cat.links ?? [],
      color: cat.color ?? "",
    });
    setDialogContext({
      level: cat.level,
      parentId: cat.parentId,
      type: cat.type as L1Type | undefined,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    if (!dialogContext) return;

    const budget = form.budget.trim() ? parseFloat(form.budget) : undefined;
    if (form.budget.trim() && (isNaN(budget!) || budget! < 0)) {
      toast.error("Please enter a valid budget amount.");
      return;
    }

    const dueDay = form.dueDay.trim()
      ? parseInt(form.dueDay, 10)
      : undefined;
    if (
      form.dueDay.trim() &&
      (isNaN(dueDay!) || dueDay! < 1 || dueDay! > 31)
    ) {
      toast.error("Due day must be a day of the month, 1 to 31.");
      return;
    }

    const effectiveBudgetType = form.budget.trim()
      ? form.budgetType
      : undefined;
    if (effectiveBudgetType === "daily" && form.budgetWeekdays.length === 0) {
      toast.error("Pick at least one day for this budget.");
      return;
    }
    const effectiveWeekdays =
      effectiveBudgetType === "daily"
        ? [...form.budgetWeekdays].sort()
        : undefined;
    // Still written so older app versions (which only read a day count) show
    // this cycle's total; current code recounts from budgetWeekdays.
    const effectiveBudgetDays = effectiveWeekdays
      ? countWeekdays(effectiveWeekdays, cycle)
      : undefined;

    setSaving(true);
    try {
      const payload: Omit<Category, "id" | "userId"> = {
        name: form.name.trim(),
        level: dialogContext.level,
        parentId: dialogContext.parentId,
        type: dialogContext.type,
        budget,
        budgetType: effectiveBudgetType,
        budgetDays: effectiveBudgetDays,
        budgetWeekdays: effectiveWeekdays,
        dueDay,
        note: form.note.trim() || undefined,
        links:
          form.links.filter((l) => l.trim()).length > 0
            ? form.links.filter((l) => l.trim())
            : undefined,
        color: form.color.trim() || undefined,
      };

      if (editTarget) {
        if (
          editTarget.level === 2 &&
          PROTECTED_L2_NAMES.includes(editTarget.name)
        ) {
          toast.error("This category cannot be renamed.");
          setSaving(false);
          return;
        }
        await editCategory(editTarget.id, {
          name: payload.name,
          budget: payload.budget,
          budgetType: payload.budgetType,
          budgetDays: payload.budgetDays,
          budgetWeekdays: payload.budgetWeekdays,
          // Legacy picked dates are superseded by weekdays; clear them on save
          budgetSelectedDates: undefined,
          dueDay: payload.dueDay,
          note: payload.note,
          links: payload.links,
          color: payload.color,
        });
        toast.success("Category updated.");
      } else {
        await createCategory(payload);
        toast.success("Category created.");
      }
      setDialogOpen(false);
    } catch (err) {
      console.error("Failed to save category", err);
      toast.error("Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const deleteBlockReason = useMemo(() => {
    if (!deleteTarget) return null;
    if (
      deleteTarget.level === 2 &&
      PROTECTED_L2_NAMES.includes(deleteTarget.name)
    )
      return "This is a system category and cannot be deleted.";
    if (deleteTarget.level === 2) {
      const childCount = categories.filter(
        (c) => c.level === 3 && c.parentId === deleteTarget.id,
      ).length;
      if (childCount > 0)
        return `This subcategory has ${childCount} item${childCount > 1 ? "s" : ""} inside it. Delete all items first.`;
    }
    if (deleteTarget.level === 3) {
      const txCount = transactions.filter(
        (t) => t.categoryId === deleteTarget.id,
      ).length;
      if (txCount > 0)
        return `${txCount} transaction${txCount > 1 ? "s are" : " is"} linked to this item. Reassign or delete them first.`;
    }
    return null;
  }, [deleteTarget, categories, transactions]);

  const handleDelete = async () => {
    if (!deleteTarget || deleteBlockReason) return;
    setDeleting(true);
    try {
      await removeCategory(deleteTarget.id);
      toast.success("Category deleted.");
    } catch {
      toast.error("Failed to delete category.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const dialogTitle = () => {
    if (editTarget) {
      if (editTarget.level === 2) return "Edit Subcategory";
      if (editTarget.level === 3) return "Edit Item";
      return "Edit Category";
    }
    if (!dialogContext) return "Add Category";
    if (dialogContext.level === 1) return "Add L1 Category";
    if (dialogContext.level === 2) return "Add Subcategory";
    return "Add Item";
  };

  return (
    <div className="p-4 md:p-6 max-w-content mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Categories</h1>

      {loadingCategories ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : loadError.categories ? (
        <LoadError what="categories" onRetry={refreshCategories} />
      ) : l1Categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <TagIcon className="size-7 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">No categories yet</p>
            <p className="mx-auto max-w-[32ch] text-sm text-muted-foreground">
              Categories sort your spending into Needs, Wants, and Savings, and
              are where budgets are set.
            </p>
          </div>
          {!isReadOnly && (
            <Button
              className="gap-2"
              onClick={() => openCreate(1, null, "needs")}
            >
              <PlusIcon /> Add categories
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {l1Categories.map((l1) => {
            const l2 = childrenOf(l1.id, 2);
            const isOpen = expanded[l1.id] !== false; // default open
            const l1Type = (l1.type ?? "needs") as L1Type;
            return (
              <Card key={l1.id}>
                <CardContent className="p-0">
                  {/* L1 Header */}
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      isOpen && "border-b border-border",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(l1.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {isOpen ? (
                        <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRightIcon className="size-4 text-muted-foreground shrink-0" />
                      )}
                      <span
                        className={cn(
                          "text-xs font-semibold uppercase px-2 py-0.5 rounded-full",
                          L1_COLORS[l1Type] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {l1.name}
                      </span>
                      {(() => {
                        const s = l1Subtotal(l1.id);
                        return s > 0 ? (
                          <span className="text-xs text-muted-foreground italic">
                            {fmtBudget(s)}
                          </span>
                        ) : null;
                      })()}
                    </button>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => openCreate(2, l1.id, l1Type)}
                        className="inline-flex items-center justify-center size-6 pointer-coarse:size-9 rounded-lg text-muted-foreground hover:bg-accent transition-colors shrink-0"
                      >
                        <PlusIcon className="size-4" />
                      </button>
                    )}
                  </div>

                  {/* L2 + L3 */}
                  {isOpen && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, l2)}
                    >
                      <SortableContext
                        items={l2.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="py-1 space-y-0.5">
                          {l2.map((cat) => (
                            <L2Row
                              key={cat.id}
                              cat={cat}
                              l1Type={l1Type}
                              l3={childrenOf(cat.id, 3)}
                              spentOf={spentOf}
                              isOpen={!!expanded[cat.id]}
                              subtotal={l2Subtotal(cat.id)}
                              isProtected={PROTECTED_L2_NAMES.includes(
                                cat.name,
                              )}
                              fmtBudget={fmtBudget}
                              toggleExpand={toggleExpand}
                              onDragEnd={handleDragEnd}
                              openCreate={openCreate}
                              openEdit={openEdit}
                              setDeleteTarget={guardedSetDeleteTarget}
                              readOnly={isReadOnly}
                            />
                          ))}
                          {l2.length === 0 && (
                            <p className="text-xs text-muted-foreground px-6 py-2">
                              No subcategories.{" "}
                              <button
                                type="button"
                                className="link-underline"
                                onClick={() => openCreate(2, l1.id, l1Type)}
                              >
                                Add one
                              </button>
                              .
                            </p>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
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
            <DialogTitle>{dialogTitle()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Groceries"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                readOnly={editTarget?.level === 1}
                className={
                  editTarget?.level === 1 ? "opacity-50 cursor-not-allowed" : ""
                }
                required
              />
            </div>

            {dialogContext?.level === 1 && !editTarget && (
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="flex gap-2">
                  {(["needs", "wants", "savings"] as L1Type[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setDialogContext((prev) =>
                          prev ? { ...prev, type: t } : prev,
                        )
                      }
                      className={cn(
                        "flex-1 py-2 text-sm font-medium capitalize rounded-lg border transition-colors",
                        dialogContext?.type === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dialogContext?.level === 3 && (
              <CategoryDetailFields
                form={form}
                setForm={setForm}
                cycle={cycle}
                idPrefix="cat"
              />
            )}
            {dialogContext?.level === 3 && (
              <>

                <div className="space-y-2">
                  <Label>Links (optional)</Label>
                  <div className="space-y-2">
                    {form.links.map((link, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          type="url"
                          placeholder="https://..."
                          value={link}
                          onChange={(e) => {
                            const updated = [...form.links];
                            updated[i] = e.target.value;
                            setForm({ ...form, links: updated });
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setForm({
                              ...form,
                              links: form.links.filter((_, j) => j !== i),
                            })
                          }
                        >
                          <TrashIcon className="text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setForm({ ...form, links: [...form.links, ""] })
                      }
                    >
                      <PlusIcon className="mr-2" />
                      Add link
                    </Button>
                  </div>
                </div>
              </>
            )}
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
                {saving ? "Saving..." : editTarget ? "Save" : "Add"}
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
            <DialogTitle>
              Delete {deleteTarget?.level === 3 ? "Item" : "Subcategory"}
            </DialogTitle>
          </DialogHeader>
          {deleteBlockReason ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{deleteBlockReason}</p>
              {deleteTarget?.level === 3 && (
                <Link
                  href={`/transactions?category=${deleteTarget.id}`}
                  onClick={() => setDeleteTarget(null)}
                  className="inline-flex items-center justify-center w-full rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                  View linked transactions
                </Link>
              )}
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
                variant="destructive-solid"
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
