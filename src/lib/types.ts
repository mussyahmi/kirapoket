import { Timestamp } from "firebase/firestore";

export interface ForecastIncomeItem {
  id: string;
  label: string;
  amount: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  salaryDay: number | null;
  salaryGraceDays?: number;
  manualCycleStart?: string;
  hideBalance: boolean;
  forecastIncomeItems?: ForecastIncomeItem[];
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
  budgetSelectedDates?: string[];
  note?: string;
  links?: string[];
  color?: string;
  sortOrder?: number;
}

export interface Debt {
  id: string;
  userId: string;
  personName: string;
  amount: number;
  note?: string;
  direction: "i_owe" | "they_owe";
  date: string;
  dueDate?: string;
  settled: boolean;
  settledDate?: string;
  createdAt: Timestamp | string;
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
