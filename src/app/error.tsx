"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlertIcon, RotateCcwIcon } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          Ref: {error.digest}
        </p>
      )}
    </div>
  );
}
