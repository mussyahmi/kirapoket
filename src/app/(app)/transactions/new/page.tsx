"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { TransactionForm } from "@/components/transactions/TransactionForm";

function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isViewingPartner, isImpersonating } = useApp();
  const isReadOnly = isViewingPartner || isImpersonating;

  if (isReadOnly) {
    router.replace("/transactions");
    return null;
  }

  return (
    <TransactionForm
      onCancel={() => router.back()}
      onDone={() =>
        router.push(
          searchParams.get("from") === "onboarding"
            ? "/home?onboarding=done"
            : "/transactions"
        )
      }
    />
  );
}

export default function NewTransactionPageWrapper() {
  return (
    <Suspense>
      <NewTransactionPage />
    </Suspense>
  );
}
