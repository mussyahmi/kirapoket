"use client";

import { useEffect, useRef, useState } from "react";
import { differenceInDays } from "date-fns";
import { ThumbsUpIcon, ThumbsDownIcon, XIcon, ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { submitFeedback } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import pkg from "../../../package.json";
import type { FeedbackPromptState } from "@/lib/types";

// Tuning — deliberately gentle. First ask waits for real usage; afterwards it's
// time-gated, and a few explicit dismissals stop it for good.
const FIRST_MILESTONE_TX = 20;   // don't ask until they've actually used the app
const COOLDOWN_DAYS = 45;        // min gap between asks that weren't converted
const GIVEN_COOLDOWN_DAYS = 120; // long quiet period after they do give feedback
const MAX_DISMISSALS = 3;        // explicit "no" this many times → stop asking

type Sentiment = "up" | "down";

/**
 * A dismissible, non-blocking feedback pulse on the home dashboard. It surfaces
 * on a usage milestone, then only occasionally, and captures a 👍/👎 plus an
 * optional note into the `feedback` collection. Cooldown lives on the profile.
 */
export default function FeedbackPulse() {
  const {
    userProfile,
    accounts,
    transactions,
    loadingProfile,
    loadingAccounts,
    loadingTransactions,
    saveUserProfile,
    isViewingPartner,
    isImpersonating,
  } = useApp();
  const { user } = useAuth();
  const isReadOnly = isViewingPartner || isImpersonating;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"ask" | "detail">("ask");
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const decidedRef = useRef(false);

  const persist = (patch: Partial<FeedbackPromptState>) => {
    const fp = userProfile?.feedbackPrompt ?? {};
    return saveUserProfile({ feedbackPrompt: { ...fp, ...patch } });
  };

  // Decide once, after data has loaded, whether to surface the pulse this session.
  useEffect(() => {
    if (decidedRef.current) return;
    if (isReadOnly || !user) return;
    if (loadingProfile || loadingAccounts || loadingTransactions) return;

    decidedRef.current = true;

    const setupComplete = accounts.length > 0;
    if (!setupComplete) return;

    const fp = userProfile?.feedbackPrompt;
    const now = new Date();
    const daysSince = (iso?: string) =>
      iso ? differenceInDays(now, new Date(iso)) : Infinity;

    if ((fp?.dismissals ?? 0) >= MAX_DISMISSALS) return;
    if (daysSince(fp?.lastGivenAt) < GIVEN_COOLDOWN_DAYS) return;
    // Cooldown only starts once they actually engage (answer/dismiss), so an
    // ignored pulse isn't burned — it just waits out this profile cooldown.
    if (daysSince(fp?.lastShownAt) < COOLDOWN_DAYS) return;
    // First-ever ask waits for a usage milestone
    if (!fp?.lastShownAt && transactions.length < FIRST_MILESTONE_TX) return;

    // Shows on every eligible Home load and stays until the user actually
    // engages — answering or dismissing is what starts the profile cooldown.
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProfile, loadingAccounts, loadingTransactions, isReadOnly, user]);

  if (!open || !user) return null;

  const nowIso = () => new Date().toISOString();

  const pick = (s: Sentiment) => {
    setSentiment(s);
    setStep("detail");
  };

  const send = async () => {
    if (!sentiment) return;
    setBusy(true);
    try {
      await submitFeedback({
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        sentiment,
        message,
        appVersion: pkg.version,
      });
      await persist({ lastGivenAt: nowIso(), lastShownAt: nowIso(), dismissals: 0 });
      toast.success("Thank you — this genuinely helps. 🙏");
      setOpen(false);
    } catch {
      toast.error("Couldn't send that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    setOpen(false);
    const fp = userProfile?.feedbackPrompt ?? {};
    void persist({ lastShownAt: nowIso(), dismissals: (fp.dismissals ?? 0) + 1 });
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-4 relative">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 text-muted-foreground/50 hover:text-foreground transition-colors"
      >
        <XIcon className="size-4" />
      </button>

      {step === "ask" ? (
        <div className="pr-6">
          <p className="text-sm font-medium">How&apos;s KiraPoket working for you?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            A quick tap helps shape what comes next.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => pick("up")}
            >
              <ThumbsUpIcon className="size-4 text-green-600 dark:text-green-400" /> Good
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => pick("down")}
            >
              <ThumbsDownIcon className="size-4 text-red-500" /> Not great
            </Button>
          </div>
        </div>
      ) : (
        <div className="pr-6">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStep("ask")}
              aria-label="Back"
              className="-ml-0.5 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
            <p className="text-sm font-medium flex items-center gap-1.5">
              {sentiment === "up" ? (
                <>
                  <ThumbsUpIcon className="size-4 text-green-600 dark:text-green-400" />
                  Love to hear it!
                </>
              ) : (
                <>
                  <ThumbsDownIcon className="size-4 text-red-500" />
                  Sorry about that.
                </>
              )}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sentiment === "up"
              ? "Anything you'd love to see next? (optional)"
              : "What's getting in your way? (optional)"}
          </p>
          <Textarea
            autoFocus
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              sentiment === "up"
                ? "Features, ideas, wins…"
                : "What's frustrating or missing…"
            }
            className="mt-2.5 resize-none"
          />
          <div className="flex items-center gap-2 mt-3">
            <Button type="button" size="sm" onClick={send} disabled={busy}>
              {busy ? "Sending…" : message.trim() ? "Send" : "Skip"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
