"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TransactionForm } from "./TransactionForm";

type AddTransactionCtx = {
  open: boolean;
  openAdd: () => void;
  close: () => void;
};

const AddTransactionContext = createContext<AddTransactionCtx | null>(null);

export function useAddTransaction() {
  const ctx = useContext(AddTransactionContext);
  if (!ctx) throw new Error("useAddTransaction must be used within AddTransactionProvider");
  return ctx;
}

/**
 * Owns a single bottom-sheet quick-add form. Any button under the provider can
 * call openAdd() to slide it up; the nav reads `open` to hide itself meanwhile.
 */
export function AddTransactionProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Safety net: never leave the sheet open across a navigation
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <AddTransactionContext.Provider
      value={{ open, openAdd: () => setOpen(true), close: () => setOpen(false) }}
    >
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] rounded-t-2xl p-0">
          <SheetHeader className="border-b shrink-0">
            <SheetTitle>New Transaction</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4">
            <TransactionForm
              embedded
              onDone={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </AddTransactionContext.Provider>
  );
}
