"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HeartHandshakeIcon, XIcon } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function PartnerBanner() {
  const { pendingInvite, acceptInvite, declineInvite } = useApp();
  const [loading, setLoading] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  if (!pendingInvite) return null;

  const inviterName = pendingInvite.inviterName ?? pendingInvite.inviterEmail;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await acceptInvite();
      toast.success(`You can now view ${inviterName}'s finances.`);
    } catch {
      toast.error("Failed to accept invite.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await declineInvite();
      setDeclineOpen(false);
      toast.success("Invite declined.");
    } catch {
      toast.error("Failed to decline invite.");
    } finally {
      setDeclining(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-start gap-3">
          <HeartHandshakeIcon className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {inviterName} invited you to view their finances
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You&apos;ll see their accounts and transactions in read-only mode.
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleAccept} disabled={loading}>
                {loading ? "Accepting…" : "Accept"}
              </Button>
              {!loading && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeclineOpen(true)}
                >
                  Decline
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={declineOpen} onOpenChange={(o) => !declining && setDeclineOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline invite?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {inviterName}{" "}will be notified that you declined their invite.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)} disabled={declining}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={declining}>
              {declining ? "Declining…" : "Yes, decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
