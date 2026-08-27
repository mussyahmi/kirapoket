import Link from "next/link";
import { CompassIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <CompassIcon className="size-8 text-primary" />
      </div>
      <div className="space-y-2">
        <p className="text-2xl font-bold tracking-tight">
          This page doesn&apos;t exist
        </p>
        <p className="mx-auto max-w-[34ch] text-sm text-muted-foreground">
          The link may be out of date, or the page may have moved.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/home"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-e1 transition-colors hover:bg-primary/90"
        >
          Go to dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
