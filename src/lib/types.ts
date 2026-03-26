import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  salaryDay: number | null;
  salaryGraceDays?: number;
  manualCycleStart?: string;
  hideBalance: boolean;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: "bank" | "cash" | "ewallet" | "credit" | "other";
  balance: number;
  createdAt: Timestamp | string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  level: 1 | 2 | 3;
  parentId: string | null;
  type?: "needs" | "wants" | "savings";
  budget?: number;
  budgetType?: "cycle" | "daily";
  budgetDays?: number;
  note?: string;
  color?: string;
  sortOrder?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  date: string;
  time?: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  note?: string;
  createdAt: Timestamp | string;
}
