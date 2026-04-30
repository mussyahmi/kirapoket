import { Timestamp } from "firebase/firestore";

export type ActivityType =
  | "login"
  | "transaction_add"
  | "transaction_delete"
  | "account_add"
  | "account_delete"
  | "debt_add"
  | "debt_settle"
  | "debt_delete";

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  description: string;
  timestamp: Timestamp;
}

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
  cycleStarts?: Record<string, string>;
  hideBalance: boolean;
  forecastIncomeItems?: ForecastIncomeItem[];
  lastLogin?: Timestamp | null;
  categoriesSeeded?: boolean;
  categoriesSeedVersion?: number;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: "bank" | "cash" | "ewallet" | "credit" | "savings" | "other";
  balance: number;
  createdAt: Timestamp | string;
  sortOrder?: number;
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
  originalAmount?: number;
  accountId?: string;
  transactionLinked?: boolean;
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
