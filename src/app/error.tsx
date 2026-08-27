"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TriangleAlertIcon, RotateCcwIcon } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  /**
   * An installed PWA can get stuck: the service worker serves cached HTML that
   * points at JS chunks a later deploy removed, so every load lands here and
   * `reset()` can't help — the bad bundle is what's being re-run. Tearing down
   * the worker and its caches is the only way out from inside the app.
   */
  const hardReset = async () => {
    setResetting(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* nothing useful to do — reload regardless */
    }
    window.location.replace(`${window.location.origin}/home`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-danger-soft">
        <TriangleAlertIcon className="size-8 text-danger-strong" />
      </div>
      <div className="space-y-2">
        <p className="text-2xl font-bold tracking-tight">
          Something went wrong
        </p>
        <p className="mx-auto max-w-[38ch] text-sm text-muted-foreground">
          Your data is safe — this is a display error. Try again, and if it
          keeps happening, reload the app.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-e1 transition-colors hover:bg-primary/90"
        >
          <RotateCcwIcon className="size-4" />
          Try again
        </button>
        <Link
          href="/home"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Go to dashboard
        </Link>
      </div>
      <button
        type="button"
        onClick={hardReset}
        disabled={resetting}
        className="link-underline text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
      >
        {resetting ? "Resetting…" : "Still stuck? Reset the app"}
      </button>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          Ref: {error.digest}
        </p>
      )}
    </div>
  );
}
