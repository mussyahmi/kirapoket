import { Timestamp } from "firebase/firestore";

export type ActivityType =
  | "login"
  | "transaction_add"
  | "transaction_edit"
  | "transaction_delete"
  | "account_add"
  | "account_delete"
  | "debt_add"
  | "debt_settle"
  | "debt_delete"
  | "partner_invite"
  | "partner_accept"
  | "partner_decline"
  | "partner_cancel"
  | "partner_disconnect";

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
  // User-uploaded avatar (overrides the Google photoURL). null/absent = use Google's.
  customPhotoURL?: string | null;
  // Show a summary/confirmation sheet before saving a transaction. Defaults to
  // true when unset.
  confirmBeforeSaving?: boolean;
  forecastIncomeItems?: ForecastIncomeItem[];
  lastLogin?: Timestamp | null;
  categoriesSeeded?: boolean;
  categoriesSeedVersion?: number;
  // A starter account is auto-created once so new users aren't blocked by the
  // "add an account" setup wall. Set once; never re-seeds after deletion.
  defaultAccountSeeded?: boolean;
  partnershipId?: string | null;
  // Cooldown state for the periodic feedback pulse (see FeedbackPulse)
  feedbackPrompt?: FeedbackPromptState;
}

export interface FeedbackPromptState {
  lastShownAt?: string;   // ISO — when the pulse card was last shown
  lastGivenAt?: string;   // ISO — when the user last submitted feedback
  dismissals?: number;    // times explicitly dismissed; enough of these = stop asking
}

export interface Feedback {
  id: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  sentiment: "up" | "down";
  message?: string;
  appVersion?: string;
  createdAt: Timestamp | string;
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

export interface Partnership {
  id: string;
  inviterUid: string;
  inviterEmail: string;
  inviterName: string | null;
  inviteeEmail: string;
  inviteeUid?: string;
  inviteeName?: string | null;
  status: "pending" | "active" | "stopped";
  createdAt: Timestamp | string;
  acceptedAt?: Timestamp | string;
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
