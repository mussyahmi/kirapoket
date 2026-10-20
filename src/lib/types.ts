import { Timestamp } from "firebase/firestore";

export type ActivityType =
  | "login"
  | "transaction_add"
  | "transaction_edit"
  | "transaction_delete"
  | "account_add"
  | "account_delete"
  | "account_archive"
  | "debt_add"
  | "debt_settle"
  | "debt_delete"
  | "partner_invite"
  | "partner_accept"
  | "partner_decline"
  | "partner_cancel"
  | "partner_disconnect"
  // Assistant failures only. Successful chats are counted in aiUsage, never
  // logged as events, and the question text is never stored anywhere.
  | "ai_error";

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
  // Signup timestamp — stamped once when the profile is first bootstrapped.
  // Absent on users created before this was tracked (no backfill).
  createdAt?: Timestamp;
  cycleStarts?: Record<string, string>;
  // User-uploaded avatar (overrides the Google photoURL). null/absent = use Google's.
  customPhotoURL?: string | null;
  // Show a summary/confirmation sheet before saving a transaction. Defaults to
  // true when unset.
  confirmBeforeSaving?: boolean;
  forecastIncomeItems?: ForecastIncomeItem[];
  lastLogin?: Timestamp | null;
  // App version the user was last seen on (set on load, like lastLogin)
  lastAppVersion?: string;
  categoriesSeeded?: boolean;
  categoriesSeedVersion?: number;
  // A starter account is auto-created once so new users aren't blocked by the
  // "add an account" setup wall. Set once; never re-seeds after deletion.
  defaultAccountSeeded?: boolean;
  partnershipId?: string | null;
  // Cooldown state for the periodic feedback pulse (see FeedbackPulse)
  feedbackPrompt?: FeedbackPromptState;
  /**
   * Free-text facts the user wants the assistant to know. Transaction data
   * alone can't tell you that a RM10 "parking" row is really a card reload,
   * or that a spouse earns separately, and those gaps are where an assistant
   * invents things. Sent verbatim as grounding context.
   */
  assistantNotes?: string;
}

export interface FeedbackPromptState {
  lastShownAt?: string; // ISO, when the pulse card was last shown
  lastGivenAt?: string; // ISO, when the user last submitted feedback
  dismissals?: number; // times explicitly dismissed; enough of these = stop asking
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
  // Archived accounts stay in Firestore (their past transactions still point at
  // them) but drop out of pickers, lists and balance totals. Absent = active.
  archived?: boolean;
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
  // Per-day budgets. budgetWeekdays (0 = Sunday … 6 = Saturday) is the current
  // model: the day count is worked out fresh for each cycle. budgetDays is the
  // count for the cycle it was saved in — still written for older app versions
  // and used as the fallback for budgets saved before weekdays existed.
  // budgetSelectedDates is legacy (one cycle's picked dates); only read to
  // pre-select weekdays when an old budget is edited.
  budgetDays?: number;
  budgetWeekdays?: number[];
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

/**
 * Where an income transaction's money came from. Only "earned" and "gift" are
 * real income; the rest are money coming back, money borrowed, your own
 * savings pulled in, or money held for someone else — counting them as income
 * makes a cycle look healthier than it was.
 *
 * Absent on transactions logged before this existed; treat missing as "earned"
 * (see `incomeSourceOf`). There is no backfill.
 */
export type IncomeSource =
  "earned" | "gift" | "returned" | "borrowed" | "withdrawn" | "held";

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
  // Income only. Absent = "earned".
  source?: IncomeSource;
  // Expense only. Paid with someone else's money: moves the balance but stays
  // out of spending totals and budgets.
  forOthers?: boolean;
  note?: string;
  createdAt: Timestamp | string;
}

/** AI assistant usage, as /api/chat reports it under the chat box. */
export interface AiUsageSummary {
  messagesLeft: number;
  dailyLimit: number;
  tokensToday: number;
  tokensMonth: number;
}
