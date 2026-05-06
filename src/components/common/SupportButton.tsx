"use client";

import { useState } from "react";
import { CoffeeIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SupportButtonProps {
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dialogOnly?: boolean;
}

const QR_ITEMS = [
  {
    label: "DuitNow QR",
    src: "/duitnow-qr.png",
    alt: "DuitNow QR",
    caption: <span>Any banking app</span>,
  },
  {
    label: "Buy Me a Coffee",
    src: "/buymeacoffee-qr.png",
    alt: "Buy Me a Coffee QR",
    caption: (
      <span>
        Scan or click{" "}
        <a href="https://buymeacoffee.com/mustafasyahmi" target="_blank" rel="noopener noreferrer" className="text-primary underline">
          here
        </a>
      </span>
    ),
  },
];

export default function SupportButton({ className, open: controlledOpen, onOpenChange, dialogOnly }: SupportButtonProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const active = QR_ITEMS[activeIndex];

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

          {/* Mobile: single slide with nav dots */}
          <div className="sm:hidden flex flex-col items-center gap-3">
            <div className="w-full flex flex-col items-center gap-2 border rounded-xl p-3">
              <p className="text-xs font-semibold">{active.label}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={active.src} alt={active.alt} className="w-full rounded-lg" draggable={false} />
              <p className="text-[10px] text-muted-foreground text-center">{active.caption}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                disabled={activeIndex === 0}
                className="p-1 rounded-full border disabled:opacity-30"
              >
                <ChevronLeftIcon className="size-4" />
              </button>
              <div className="flex gap-1.5">
                {QR_ITEMS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`size-2 rounded-full transition-colors ${i === activeIndex ? "bg-foreground" : "bg-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setActiveIndex((i) => Math.min(QR_ITEMS.length - 1, i + 1))}
                disabled={activeIndex === QR_ITEMS.length - 1}
                className="p-1 rounded-full border disabled:opacity-30"
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>
          </div>

          {/* sm+: 2-col grid */}
          <div className="hidden sm:grid grid-cols-2 gap-3">
            {QR_ITEMS.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2 border rounded-xl p-3">
                <p className="text-xs font-semibold">{item.label}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt={item.alt} className="w-full rounded-lg" draggable={false} />
                <p className="text-[10px] text-muted-foreground text-center">{item.caption}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
