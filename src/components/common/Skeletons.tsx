import { CloudOffIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholders shaped like the content they stand in for.
 *
 * A single grey blob is the wrong shape by definition, so the layout jumps
 * when real data lands — which is the one thing a skeleton exists to prevent.
 */

/** Icon + two stacked lines + a trailing amount. Matches transaction/account rows. */
export function RowSkeleton({ lines = 2 }: { lines?: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-32" />
        {lines === 2 && <Skeleton className="h-2 w-20" />}
      </div>
      <Skeleton className="h-3 w-16 shrink-0" />
    </div>
  );
}

/** A card with a title and n rows. */
export function CardListSkeleton({
  rows = 3,
  title = true,
}: {
  rows?: number;
  title?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-2">
        {title && <Skeleton className="mb-3 h-4 w-28" />}
        {Array.from({ length: rows }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </CardContent>
    </Card>
  );
}

/** Mirrors CycleSummaryCard: hero figure, meter, then two stat columns. */
export function SummarySkeleton() {
  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-6">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="mt-2 h-2 w-full max-w-xs rounded-full" />
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center justify-center gap-3 px-4 py-4"
            >
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-2 w-14" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Shown when a read failed. Distinct from an empty state on purpose: telling
 * someone with 500 transactions that they have none — and inviting them to
 * add one — is worse than saying nothing.
 */
export function LoadError({
  what,
  onRetry,
}: {
  what: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="bg-danger-soft flex size-16 items-center justify-center rounded-full">
        <CloudOffIcon className="text-danger-strong size-7" />
      </div>
      <div className="space-y-2">
        <p className="text-base font-semibold">
          Couldn&apos;t load your {what}
        </p>
        <p className="text-muted-foreground mx-auto max-w-[34ch] text-sm">
          Your data is safe — this is a connection problem. Check your network
          and try again.
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" className="gap-2" onClick={onRetry}>
          <RotateCcwIcon />
          Try again
        </Button>
      )}
    </div>
  );
}
