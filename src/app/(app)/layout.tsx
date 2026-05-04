"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { AppShell } from "@/components/layout/AppShell";
import { PartnerBanner } from "@/components/common/PartnerBanner";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HeartHandshakeIcon } from "lucide-react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { isImpersonating, stopImpersonating, isViewingPartner, partnership, pausePartnerView, partnerDeclinedAlert, clearPartnerDeclinedAlert, userProfile } = useApp();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (partnerDeclinedAlert) {
      toast.info("Your partner invite was declined.", { id: "partner-declined" });
      clearPartnerDeclinedAlert();
    }
  }, [partnerDeclinedAlert, clearPartnerDeclinedAlert]);

  if (!loading && !user) return null;

  const banner = (
    <>
      {mounted && isImpersonating && (
        <div className="flex items-center justify-between gap-2 bg-primary px-4 py-1.5 text-primary-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <HeartHandshakeIcon className="size-3.5" />
            Viewing {userProfile?.displayName ?? userProfile?.email ?? "user"}&apos;s finances — read only
          </span>
          <button
            type="button"
            onClick={() => { stopImpersonating(); router.push("/admin"); }}
            className="underline shrink-0"
          >
            Stop
          </button>
        </div>
      )}
      {mounted && isViewingPartner && partnership && (
        <div className="flex items-center justify-between gap-2 bg-primary px-4 py-1.5 text-primary-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <HeartHandshakeIcon className="size-3.5" />
            Viewing{" "}
            {partnership.inviterUid === user?.uid
              ? partnership.inviteeEmail
              : (partnership.inviterName ?? partnership.inviterEmail)}
            &apos;s finances — read only
          </span>
          <button
            type="button"
            onClick={() => { pausePartnerView(); toast.success("Switched back to your data."); }}
            className="underline shrink-0"
          >
            Stop
          </button>
        </div>
      )}
      <PartnerBanner />
    </>
  );

  return (
    <AppShell banner={banner}>
      {children}
    </AppShell>
  );
}
