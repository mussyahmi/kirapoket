"use client";

import { useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { getSalaryCycleRange } from "@/lib/firestore";
import type { CycleRange } from "@/lib/budget";

/**
 * Today's salary cycle for the profile being viewed. Falls back to the 25th
 * when no salary day is set, the same default as the budget page.
 */
export function useCurrentCycle(): CycleRange {
  const { userProfile } = useApp();
  const salaryDay = userProfile?.salaryDay ?? 25;
  const cycleStarts = userProfile?.cycleStarts;
  return useMemo(
    () => getSalaryCycleRange(salaryDay, new Date(), { cycleStarts }),
    [salaryDay, cycleStarts],
  );
}
