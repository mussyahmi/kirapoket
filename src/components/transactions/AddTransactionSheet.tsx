"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TransactionForm } from "./TransactionForm";
import { cn } from "@/lib/utils";

type AddTransactionCtx = {
  open: boolean;
  editId: string | null;
  openAdd: () => void;
  openEdit: (id: string) => void;
  close: () => void;
};

const AddTransactionContext = createContext<AddTransactionCtx | null>(null);

export function useAddTransaction() {
  const ctx = useContext(AddTransactionContext);
  if (!ctx) throw new Error("useAddTransaction must be used within AddTransactionProvider");
  return ctx;
}

/**
 * Owns a single bottom-sheet transaction form for both quick-add and edit.
 * Any button under the provider can call openAdd() / openEdit(id) to slide it
 * up; the nav reads `open` to hide itself meanwhile.
 */
export function AddTransactionProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  // True while the form's confirm dialog is up — recede & lock the sheet chrome
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pathname = usePathname();

  // Safety net: never leave the sheet open across a navigation
  useEffect(() => { setOpen(false); setEditId(null); }, [pathname]);

  const close = () => setOpen(false);

  // Fade + blur + inert; also stop the body scrolling behind the confirm dialog
  const recede = confirmOpen && "blur-[3px] opacity-50 pointer-events-none select-none";

  return (
    <AddTransactionContext.Provider
      value={{
        open,
        editId,
        openAdd: () => { setEditId(null); setOpen(true); },
        openEdit: (id: string) => { setEditId(id); setOpen(true); },
        close,
      }}
    >
      {children}
      <Sheet
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setConfirmOpen(false); } }}
      >
        <SheetContent side="bottom" className="max-h-[92vh] rounded-t-2xl p-0 sm:mx-auto sm:max-w-xl">
          <SheetHeader className={cn("border-b shrink-0 transition-[filter,opacity] duration-200", recede)}>
            <SheetTitle>{editId ? "Edit Transaction" : "New Transaction"}</SheetTitle>
          </SheetHeader>
          <div
            className={cn(
              "flex-1 min-h-0 px-4 pt-4 transition-[filter,opacity] duration-200",
              confirmOpen ? "overflow-hidden" : "overflow-y-auto",
              recede
            )}
          >
            <TransactionForm
              key={editId ?? "new"}
              embedded
              editId={editId ?? undefined}
              onDone={close}
              onCancel={close}
              onConfirmOpenChange={setConfirmOpen}
            />
          </div>
        </SheetContent>
      </Sheet>
    </AddTransactionContext.Provider>
  );
}
