"use client";

import { useState } from "react";
import { MessageSquareIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function FeedbackButton({ className }: { className?: string }) {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowFeedbackDialog(true)}
        title="Give Feedback"
        className={className}
      >
        <MessageSquareIcon className="size-4 shrink-0" />
        Give Feedback
      </button>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Feedback</DialogTitle>
            <DialogDescription>
              Help us improve KiraPoket! Your feedback and suggestions are
              greatly appreciated. Click the button below to open the feedback
              board where you can share your thoughts, report issues,
              or suggest new features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                window.open("https://insigh.to/b/kirapoket", "_blank");
                setShowFeedbackDialog(false);
              }}
            >
              Open Feedback Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
