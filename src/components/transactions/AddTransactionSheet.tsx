"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
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
  // Called with a saved transaction's id — added or edited — once the sheet has
  // finished closing. Returns an unsubscribe function.
  subscribeSaved: (fn: (id: string) => void) => () => void;
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
  const router = useRouter();

  // Safety net: never leave the sheet open across a navigation
  useEffect(() => {
    setOpen(false);
    setEditId(null);
  }, [pathname]);

  const close = () => setOpen(false);

  // The id is held until the close animation completes rather than announced
  // on save: releasing the sheet's scroll lock puts the page back at the scroll
  // position it had when the sheet opened, which would undo an earlier scroll.
  const pendingSavedId = useRef<string | null>(null);
  const savedListeners = useRef(new Set<(id: string) => void>());
  const subscribeSaved = useCallback((fn: (id: string) => void) => {
    savedListeners.current.add(fn);
    return () => {
      savedListeners.current.delete(fn);
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
        subscribeSaved,
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
          const id = pendingSavedId.current;
          pendingSavedId.current = null;
          if (!id) return;
          // Saving always lands on the list, wherever the sheet was opened
          // from. The id rides in the URL rather than a live broadcast: the
          // list may not be mounted yet, and a listener that isn't there when
          // the event fires never hears it.
          if (pathname === "/transactions") {
            // Already here, so nothing remounts and the listener is live.
            requestAnimationFrame(() =>
              savedListeners.current.forEach((fn) => fn(id)),
            );
          } else {
            router.push(`/transactions?saved=${encodeURIComponent(id)}`);
          }
        }}
      >
        <SheetContent
          side="bottom"
          // Full-screen on mobile (covers the app header); a regular bottom
          // sheet from sm up. z-[65] clears the mobile header (z-60) while
          // staying under the confirm dialog (z-70).
          className="z-[65] h-dvh! max-h-none rounded-none p-0 sm:h-auto! sm:max-h-[92vh] sm:rounded-t-2xl sm:mx-auto sm:max-w-xl"
          // Hide the sheet's own close button while the confirm dialog is up —
          // it sits outside the receded area, so it'd otherwise stay sharp and
          // could close the whole sheet from behind the dialog.
          showCloseButton={!confirmOpen}
        >
          <SheetHeader
            className={cn(
              "border-b shrink-0 transition-[filter,opacity] duration-200",
              "pt-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] sm:pt-4",
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
              onDone={(savedId) => {
                pendingSavedId.current = savedId ?? null;
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
