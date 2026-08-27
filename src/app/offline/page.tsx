import { WifiOffIcon } from "lucide-react";

export const metadata = { title: "Offline – KiraPoket" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <WifiOffIcon className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="text-2xl font-bold tracking-tight">You&apos;re offline</p>
        <p className="mx-auto max-w-[36ch] text-sm text-muted-foreground">
          This page hasn&apos;t been saved for offline use yet. Pages
          you&apos;ve already opened will still work.
        </p>
      </div>
      <a
        href="/home"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-e1"
      >
        Go to dashboard
      </a>
    </div>
  );
}
