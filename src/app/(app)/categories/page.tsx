"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  GripVerticalIcon,
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
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import type { Category } from "@/lib/types";

type L1Type = "needs" | "wants" | "savings";

const L1_COLORS: Record<L1Type, string> = {
  needs: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  wants: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  savings: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const L1_DOT: Record<L1Type, string> = {
  needs: "bg-green-400 dark:bg-green-500",
  wants: "bg-orange-400 dark:bg-orange-500",
  savings: "bg-blue-400 dark:bg-blue-500",
};

const L1_HEX: Record<L1Type, string> = {
  needs: "#4ade80",
  wants: "#fb923c",
  savings: "#60a5fa",
};

interface CategoryFormData {
  name: string;
  budgetType: "cycle" | "daily";
  budget: string;
  budgetSelectedDates: Date[];
  note: string;
  links: string[];
  color: string;
}

const DEFAULT_FORM: CategoryFormData = {
  name: "",
  budgetType: "cycle",
  budget: "",
  budgetSelectedDates: [],
  note: "",
  links: [],
  color: "",
};

// ─── L3Item ───────────────────────────────────────────────────────────────────

interface L3ItemProps {
  item: Category;
  openEdit: (cat: Category) => void;
  setDeleteTarget: (cat: Category) => void;
}

function fmtItemBudget(c: Category): string | null {
  if (c.budget === undefined) return null;
  if (c.budgetType === "daily") {
    const days = c.budgetDays ?? 30;
    const total = (c.budget * days).toLocaleString("ms-MY", { minimumFractionDigits: 2 });
    return `· RM ${total}`;
  }
  const amt = c.budget.toLocaleString("ms-MY", { minimumFractionDigits: 2 });
  return `· RM ${amt}`;
}

function L3Item({ item, openEdit, setDeleteTarget }: L3ItemProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const hasDetails = item.budget !== undefined || item.note || (item.links && item.links.length > 0);

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.4 : 1,
        }}
        className="flex items-center gap-1 py-1.5 pr-2 hover:bg-muted/50 rounded-lg group"
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          tabIndex={-1}
          aria-label="Drag to reorder"
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/20 hover:text-muted-foreground/60 shrink-0 px-1"
        >
          <GripVerticalIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex-1 text-sm text-muted-foreground truncate flex items-center gap-1.5 min-w-0 text-left"
        >
          <span className="truncate">{item.name}</span>
          {fmtItemBudget(item) && (
            <span className="text-xs shrink-0 text-muted-foreground/60">
              {fmtItemBudget(item)}
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground opacity-50 hover:opacity-100 hover:bg-accent transition-colors shrink-0">
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
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{item.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!hasDetails && (
              <p className="text-sm text-muted-foreground">No details added yet.</p>
            )}
            {item.budget !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Budget</p>
                <p className="text-sm">{fmtItemBudget(item)?.replace("· ", "")}</p>
                {item.budgetType === "daily" && item.budgetDays && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    RM {item.budget?.toFixed(2)}/day × {item.budgetDays} days
                  </p>
                )}
              </div>
            )}
            {item.note && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Note</p>
                <p className="text-sm whitespace-pre-wrap">{item.note}</p>
              </div>
            )}
            {item.links && item.links.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Links</p>
                <div className="space-y-1">
                  {item.links.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-primary truncate underline underline-offset-2"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => { setPreviewOpen(false); openEdit(item); }}
            >
              <PencilIcon className="size-4 mr-2" /> Edit
            </Button>
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
  isOpen: boolean;
  subtotal: number;
  fmtBudget: (n: number) => string;
  toggleExpand: (id: string) => void;
  onDragEnd: (e: DragEndEvent, siblings: { id: string }[]) => void;
  openCreate: (level: 1 | 2 | 3, parentId: string | null, type?: L1Type) => void;
  openEdit: (cat: Category) => void;
  setDeleteTarget: (cat: Category) => void;
}

function L2Row({
  cat,
  l1Type,
  l3,
  isOpen,
  subtotal,
  fmtBudget,
  toggleExpand,
  onDragEnd,
  openCreate,
  openEdit,
  setDeleteTarget,
}: L2RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
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
        <button
          type="button"
          {...attributes}
          {...listeners}
          tabIndex={-1}
          aria-label="Drag to reorder"
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/20 hover:text-muted-foreground/60 shrink-0 px-1"
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => toggleExpand(cat.id)}
          className="flex items-center gap-1.5 flex-1 text-left min-w-0"
        >
          <span className={cn("size-1.5 rounded-full shrink-0", L1_DOT[l1Type])} />
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
            <span className="text-xs text-muted-foreground/50 italic shrink-0">
              {fmtBudget(subtotal)}
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground opacity-50 hover:opacity-100 hover:bg-accent transition-colors shrink-0">
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => openCreate(3, cat.id, l1Type)}>
              <PlusIcon className="size-3.5 mr-2" /> Add item
            </DropdownMenuItem>
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
          </DropdownMenuContent>
        </DropdownMenu>
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
              style={{ borderColor: (L1_HEX[l1Type] ?? "#94a3b8") + "66" }}
            >
              {l3.map((item) => (
                <L3Item
                  key={item.id}
                  item={item}
                  openEdit={openEdit}
                  setDeleteTarget={setDeleteTarget}
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
    loadingCategories,
    createCategory,
    editCategory,
    removeCategory,
    reorderCategoryItems,
  } = useApp();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
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

  const effectiveBudget = (c: Category): number => {
    if (c.budget === undefined) return 0;
    if (c.budgetType === "daily") return c.budget * (c.budgetDays ?? 30);
    return c.budget;
  };

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
    siblings: { id: string }[]
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
    type?: L1Type
  ) => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setDialogContext({ level, parentId, type });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setForm({
      name: cat.name,
      budgetType: cat.budgetType ?? "cycle",
      budget: cat.budget !== undefined ? String(cat.budget) : "",
      budgetSelectedDates: cat.budgetSelectedDates
        ? cat.budgetSelectedDates.map(s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); })
        : [],
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

    const effectiveBudgetType = form.budget.trim() ? form.budgetType : undefined;
    const effectiveBudgetDays = effectiveBudgetType === "daily" && form.budgetSelectedDates.length > 0
      ? form.budgetSelectedDates.length : undefined;
    const effectiveSelectedDates = effectiveBudgetType === "daily" && form.budgetSelectedDates.length > 0
      ? form.budgetSelectedDates.map(d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`) : undefined;

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
        budgetSelectedDates: effectiveSelectedDates,
        note: form.note.trim() || undefined,
        links: form.links.filter(l => l.trim()).length > 0 ? form.links.filter(l => l.trim()) : undefined,
        color: form.color.trim() || undefined,
      };

      if (editTarget) {
        await editCategory(editTarget.id, {
          name: payload.name,
          budget: payload.budget,
          budgetType: payload.budgetType,
          budgetDays: payload.budgetDays,
          budgetSelectedDates: payload.budgetSelectedDates,
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
    } catch {
      toast.error("Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
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
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-semibold">Categories</h1>

      {loadingCategories ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : l1Categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <p className="text-sm">
            No categories yet. Start by adding Needs, Wants &amp; Savings.
          </p>
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
                      isOpen && "border-b border-border"
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
                          L1_COLORS[l1Type] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {l1.name}
                      </span>
                      {(() => {
                        const s = l1Subtotal(l1.id);
                        return s > 0 ? (
                          <span className="text-xs text-muted-foreground/50 italic">
                            {fmtBudget(s)}
                          </span>
                        ) : null;
                      })()}
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreate(2, l1.id, l1Type)}
                      className="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground hover:bg-accent transition-colors shrink-0"
                    >
                      <PlusIcon className="size-4" />
                    </button>
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
                              isOpen={!!expanded[cat.id]}
                              subtotal={l2Subtotal(cat.id)}
                              fmtBudget={fmtBudget}
                              toggleExpand={toggleExpand}
                              onDragEnd={handleDragEnd}
                              openCreate={openCreate}
                              openEdit={openEdit}
                              setDeleteTarget={setDeleteTarget}
                            />
                          ))}
                          {l2.length === 0 && (
                            <p className="text-xs text-muted-foreground px-6 py-2">
                              No subcategories.{" "}
                              <button
                                type="button"
                                className="underline"
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
            <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label>Type</Label>
                <div className="flex gap-2">
                  {(["needs", "wants", "savings"] as L1Type[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setDialogContext((prev) =>
                          prev ? { ...prev, type: t } : prev
                        )
                      }
                      className={cn(
                        "flex-1 py-2 text-sm font-medium capitalize rounded-lg border transition-colors",
                        dialogContext?.type === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dialogContext?.level === 3 && (
              <div className="space-y-3">
                {/* Budget type toggle */}
                <div className="space-y-1.5">
                  <Label>Budget (optional)</Label>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    {(["cycle", "daily"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, budgetType: t })}
                        className={cn(
                          "flex-1 py-1.5 text-sm font-medium transition-colors",
                          form.budgetType === t
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {t === "cycle" ? "Per Cycle" : "Per Day"}
                      </button>
                    ))}
                  </div>
                </div>

                {form.budgetType === "cycle" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="cat-budget">Amount (MYR)</Label>
                    <Input
                      id="cat-budget"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cat-budget-daily">Amount / day (MYR)</Label>
                      <Input
                        id="cat-budget-daily"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.budget}
                        onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 mt-4">
                      <Label>Select days this cycle</Label>
                      <div className="rounded-xl border border-border min-h-[420px]">
                        <Calendar
                          mode="multiple"
                          selected={form.budgetSelectedDates}
                          onSelect={(dates: Date[] | undefined) => setForm({ ...form, budgetSelectedDates: dates ?? [] })}
                          className="w-full"
                        />
                      </div>
                    </div>
                    {form.budget && parseFloat(form.budget) > 0 && form.budgetSelectedDates.length > 0 && (
                      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                        <span className="text-xs text-muted-foreground">
                          {form.budgetSelectedDates.length} days selected
                        </span>
                        <span className="text-sm font-semibold">
                          RM {(parseFloat(form.budget) * form.budgetSelectedDates.length).toLocaleString("ms-MY", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {dialogContext?.level === 3 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-note">Note (optional)</Label>
                  <Textarea
                    id="cat-note"
                    placeholder="Add a note..."
                    rows={3}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
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
                          onClick={() => setForm({ ...form, links: form.links.filter((_, j) => j !== i) })}
                        >
                          <TrashIcon className="size-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setForm({ ...form, links: [...form.links, ""] })}
                    >
                      <PlusIcon className="size-4 mr-1.5" />
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
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong>{deleteTarget?.name}</strong>? Subcategories will also be
            orphaned.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
