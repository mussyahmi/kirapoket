"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  completedStep: string;
  nextStep: string;
  nextDescription: string;
  ctaLabel: string;
  ctaHref: string;
}

export function OnboardingNextModal({
  open,
  onClose,
  completedStep,
  nextStep,
  nextDescription,
  ctaLabel,
  ctaHref,
}: Props) {
  const router = useRouter();

  const handleCta = () => {
    onClose();
    router.push(ctaHref);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2Icon className="size-5 text-primary shrink-0" />
            <DialogTitle>{completedStep}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1">
          <p className="text-sm font-medium">Next up: {nextStep}</p>
          <p className="text-xs text-muted-foreground">{nextDescription}</p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={handleCta}>
            {ctaLabel}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
