"use client";

import { useState } from "react";
import { MessageSquareIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FeedbackButtonProps {
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dialogOnly?: boolean;
}

export default function FeedbackButton({ className, open: controlledOpen, onOpenChange, dialogOnly }: FeedbackButtonProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  function openFeedbackBoard() {
    setOpen(false);
    setTimeout(() => { window.open("https://insigh.to/b/kirapoket", "_blank"); }, 150);
  }

  return (
    <>
      {!dialogOnly && (
        <button onClick={() => setOpen(true)} title="Give Feedback" className={className}>
          <MessageSquareIcon className="size-4 shrink-0" />
          Give Feedback
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give Feedback</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Help us improve KiraPoket! Share your thoughts, report issues, or suggest new features on our feedback board.
          </p>
          <DialogFooter>
            <Button onClick={openFeedbackBoard} className="w-full sm:w-auto">
              Open Feedback Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
