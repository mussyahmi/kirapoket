"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TransactionForm } from "./TransactionForm";
import { cn } from "@/lib/utils";

type AddTransactionCtx = {
  open: boolean;
  editId: string | null;
  openAdd: () => void;
  openEdit: (id: string) => void;
  close: () => void;
  // Called with a newly added transaction's id once the sheet has finished
  // closing. Returns an unsubscribe function.
  subscribeAdded: (fn: (id: string) => void) => () => void;
};

const AddTransactionContext = createContext<AddTransactionCtx | null>(null);

export function useAddTransaction() {
  const ctx = useContext(AddTransactionContext);
  if (!ctx)
    throw new Error(
      "useAddTransaction must be used within AddTransactionProvider",
    );
  return ctx;
}

/**
 * Owns a single bottom-sheet transaction form for both quick-add and edit.
 * Any button under the provider can call openAdd() / openEdit(id) to slide it
 * up; the nav reads `open` to hide itself meanwhile.
 */
export function AddTransactionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  // True while the form's confirm dialog is up — recede & lock the sheet chrome
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pathname = usePathname();

  // Safety net: never leave the sheet open across a navigation
  useEffect(() => {
    setOpen(false);
    setEditId(null);
  }, [pathname]);

  const close = () => setOpen(false);

  // The id is held until the close animation completes rather than announced
  // on save: releasing the sheet's scroll lock puts the page back at the scroll
  // position it had when the sheet opened, which would undo an earlier scroll.
  const pendingAddedId = useRef<string | null>(null);
  const addedListeners = useRef(new Set<(id: string) => void>());
  const subscribeAdded = useCallback((fn: (id: string) => void) => {
    addedListeners.current.add(fn);
    return () => {
      addedListeners.current.delete(fn);
    };
  }, []);

  // Fade + blur + inert; also stop the body scrolling behind the confirm dialog
  const recede =
    confirmOpen && "blur-[3px] opacity-50 pointer-events-none select-none";

  return (
    <AddTransactionContext.Provider
      value={{
        open,
        editId,
        openAdd: () => {
          setEditId(null);
          setOpen(true);
        },
        openEdit: (id: string) => {
          setEditId(id);
          setOpen(true);
        },
        close,
        subscribeAdded,
      }}
    >
      {children}
      <Sheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditId(null);
            setConfirmOpen(false);
          }
        }}
        onOpenChangeComplete={(v) => {
          if (v) return;
          const id = pendingAddedId.current;
          pendingAddedId.current = null;
          // Next frame: Base UI runs this inside its own flushSync, and a
          // listener may need to flushSync a render (e.g. revealing more rows).
          if (id)
            requestAnimationFrame(() =>
              addedListeners.current.forEach((fn) => fn(id)),
            );
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[92vh] rounded-t-2xl p-0 sm:mx-auto sm:max-w-xl"
          // Hide the sheet's own close button while the confirm dialog is up —
          // it sits outside the receded area, so it'd otherwise stay sharp and
          // could close the whole sheet from behind the dialog.
          showCloseButton={!confirmOpen}
        >
          <SheetHeader
            className={cn(
              "border-b shrink-0 transition-[filter,opacity] duration-200",
              recede,
            )}
          >
            <SheetTitle>
              {editId ? "Edit Transaction" : "New Transaction"}
            </SheetTitle>
          </SheetHeader>
          <div
            className={cn(
              // overscroll-contain: at either end of the form, a swipe would
              // otherwise chain out and rubber-band the page behind the sheet.
              "flex-1 min-h-0 px-4 pt-4 overscroll-contain transition-[filter,opacity] duration-200",
              confirmOpen ? "overflow-hidden" : "overflow-y-auto",
              recede,
            )}
          >
            <TransactionForm
              key={editId ?? "new"}
              embedded
              editId={editId ?? undefined}
              onDone={(addedId) => {
                pendingAddedId.current = addedId ?? null;
                close();
              }}
              onCancel={close}
              onConfirmOpenChange={setConfirmOpen}
            />
          </div>
        </SheetContent>
      </Sheet>
    </AddTransactionContext.Provider>
  );
}
