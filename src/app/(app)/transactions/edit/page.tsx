"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { TransactionForm } from "@/components/transactions/TransactionForm";

/**
 * Kept only so existing links and browser history for `/transactions/edit?id=`
 * keep working — editing normally happens in the bottom sheet
 * (`useAddTransaction().openEdit`). This delegates to the same form the sheet
 * and `/transactions/new` use; it previously hand-reimplemented the whole form
 * in ~560 lines, which had already drifted (it was missing the loading
 * skeletons the real form renders).
 */
function EditTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isViewingPartner, isImpersonating } = useApp();
  const isReadOnly = isViewingPartner || isImpersonating;
  const id = searchParams.get("id") ?? "";

  if (isReadOnly || !id) {
    router.replace("/transactions");
    return null;
  }

  return (
    <TransactionForm
      editId={id}
      onCancel={() => router.back()}
      onDone={() => router.push("/transactions")}
    />
  );
}

export default function EditTransactionPageWrapper() {
  return (
    <Suspense>
      <EditTransactionPage />
    </Suspense>
  );
}
