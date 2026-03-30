"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { AppShell } from "@/components/layout/AppShell";
import { useRouter } from "next/navigation";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { isImpersonating, stopImpersonating } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (!loading && !user) return null;

  return (
    <AppShell>
      {isImpersonating && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-orange-500 px-4 py-1.5 text-white text-xs font-medium">
          <span>Viewing as another user — read only</span>
          <button
            type="button"
            onClick={() => { stopImpersonating(); router.push("/admin"); }}
            className="underline shrink-0"
          >
            Stop
          </button>
        </div>
      )}
      {children}
    </AppShell>
  );
}
