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

  // Arriving from a due bill on the home screen: the category is the reason
  // for the trip, so the form opens pointed at it with the outstanding amount
  // already in the field.
  const prefillCategoryId = searchParams.get("category") ?? undefined;
  const amountParam = searchParams.get("amount");
  const parsedAmount = amountParam ? Number(amountParam) : NaN;
  const prefillAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined;

  return (
    <TransactionForm
      prefillCategoryId={prefillCategoryId}
      prefillAmount={prefillAmount}
      onCancel={() => router.back()}
      onDone={() =>
        router.push(
          searchParams.get("from") === "onboarding"
            ? "/home?onboarding=done"
            : "/transactions",
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
