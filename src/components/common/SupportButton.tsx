"use client";

import { useState } from "react";
import { CoffeeIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SupportButtonProps {
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dialogOnly?: boolean;
}

export default function SupportButton({ className, open: controlledOpen, onOpenChange, dialogOnly }: SupportButtonProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <>
      {!dialogOnly && (
        <button onClick={() => setOpen(true)} className={className}>
          <CoffeeIcon className="size-4 shrink-0" />
          Buy Me a Coffee
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:!max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buy Me a Coffee</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Thank you for supporting KiraPoket! Scan any QR code below.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-2 border rounded-xl p-3">
              <p className="text-xs font-semibold">DuitNow QR</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/duitnow-qr.png" alt="DuitNow QR" className="w-full rounded-lg" draggable={false} />
              <p className="text-[10px] text-muted-foreground text-center">Any banking app</p>
            </div>

            <div className="flex flex-col items-center gap-2 border rounded-xl p-3">
              <p className="text-xs font-semibold">Buy Me a Coffee</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/buymeacoffee-qr.png" alt="Buy Me a Coffee QR" className="w-full rounded-lg" draggable={false} />
              <p className="text-[10px] text-muted-foreground text-center">Scan or click <a href="https://buymeacoffee.com/mustafasyahmi" target="_blank" rel="noopener noreferrer" className="text-primary underline">here</a></p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
