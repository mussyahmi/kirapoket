"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { Account, Category, Transaction, UserProfile, Debt } from "@/lib/types";
import {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getDebts,
  addDebt,
  updateDebt,
  deleteDebt,
  getUserProfile,
  updateUserProfile,
  seedDefaultCategories,
} from "@/lib/firestore";
import { useAuth } from "./AuthContext";

export const ADMIN_UID = "UG4u9m0jkUh5xqqloijX1zeprXi2";

interface AppContextValue {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  userProfile: UserProfile | null;
  loadingAccounts: boolean;
  loadingCategories: boolean;
  loadingTransactions: boolean;
  loadingProfile: boolean;
  isImpersonating: boolean;
  impersonate: (uid: string) => void;
  stopImpersonating: () => void;

  // Accounts
  refreshAccounts: () => Promise<void>;
  createAccount: (
    data: Omit<Account, "id" | "userId" | "createdAt">
  ) => Promise<Account>;
  editAccount: (
    id: string,
    data: Partial<Omit<Account, "id" | "userId" | "createdAt">>
  ) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;

  // Categories
  refreshCategories: () => Promise<void>;
  createCategory: (data: Omit<Category, "id" | "userId">) => Promise<Category>;
  editCategory: (
    id: string,
    data: Partial<Omit<Category, "id" | "userId">>
  ) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  reorderCategoryItems: (ids: string[]) => Promise<void>;

  // Transactions
  refreshTransactions: () => Promise<void>;
  createTransaction: (
    data: Omit<Transaction, "id" | "userId" | "createdAt">
  ) => Promise<Transaction>;
  editTransaction: (
    id: string,
    data: Partial<Omit<Transaction, "id" | "userId" | "createdAt">>
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;

  // Debts
  debts: Debt[];
  loadingDebts: boolean;
  refreshDebts: () => Promise<void>;
  createDebt: (data: Omit<Debt, "id" | "userId" | "createdAt">) => Promise<Debt>;
  editDebt: (id: string, data: Partial<Omit<Debt, "id" | "userId" | "createdAt">>) => Promise<void>;
  removeDebt: (id: string) => Promise<void>;

  // Profile
  refreshProfile: () => Promise<void>;
  saveUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingDebts, setLoadingDebts] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [impersonatedUid, setImpersonatedUid] = useState<string | null>(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("impersonatedUid");
    return null;
  });
  const uid = impersonatedUid ?? user?.uid;

  const impersonate = useCallback((targetUid: string) => {
    sessionStorage.setItem("impersonatedUid", targetUid);
    setImpersonatedUid(targetUid);
  }, []);
  const stopImpersonating = useCallback(() => {
    sessionStorage.removeItem("impersonatedUid");
    setImpersonatedUid(null);
  }, []);
  const isImpersonating = impersonatedUid !== null;

  const refreshProfile = useCallback(async () => {
    if (!uid) return;
    setLoadingProfile(true);
    try {
      const profile = await getUserProfile(uid);
      if (profile) {
        setUserProfile(profile);
      } else if (!impersonatedUid) {
        // Bootstrap profile only for the real user, not impersonated targets
        const bootstrapped: UserProfile = {
          uid,
          email: user?.email ?? null,
          displayName: user?.displayName ?? null,
          photoURL: user?.photoURL ?? null,
          salaryDay: null,
          hideBalance: false,
        };
        await updateUserProfile(uid, bootstrapped);
        setUserProfile(bootstrapped);
        await seedDefaultCategories(uid);
        const seeded = await getCategories(uid);
        setCategories(seeded);
      }
    } finally {
      setLoadingProfile(false);
    }
  }, [uid, user, impersonatedUid]);

  const refreshAccounts = useCallback(async () => {
    if (!uid) return;
    setLoadingAccounts(true);
    try {
      const data = await getAccounts(uid);
      setAccounts(data);
    } finally {
      setLoadingAccounts(false);
    }
  }, [uid]);

  const refreshCategories = useCallback(async () => {
    if (!uid) return;
    setLoadingCategories(true);
    try {
      const data = await getCategories(uid);
      setCategories(data);
    } finally {
      setLoadingCategories(false);
    }
  }, [uid]);

  const refreshTransactions = useCallback(async () => {
    if (!uid) return;
    setLoadingTransactions(true);
    try {
      const data = await getTransactions(uid);
      setTransactions(data);
    } finally {
      setLoadingTransactions(false);
    }
  }, [uid]);

  const refreshDebts = useCallback(async () => {
    if (!uid) return;
    setLoadingDebts(true);
    try {
      const data = await getDebts(uid);
      setDebts(data);
    } finally {
      setLoadingDebts(false);
    }
  }, [uid]);

  useEffect(() => {
    if (uid) {
      refreshProfile();
      refreshAccounts();
      refreshCategories();
      refreshTransactions();
      refreshDebts();
    } else if (!authLoading) {
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setDebts([]);
      setUserProfile(null);
      setLoadingAccounts(false);
      setLoadingCategories(false);
      setLoadingTransactions(false);
      setLoadingDebts(false);
      setLoadingProfile(false);
    }
  }, [uid, authLoading, refreshProfile, refreshAccounts, refreshCategories, refreshTransactions, refreshDebts]);

  // ── Account CRUD ──────────────────────────────────────────────────────────

  const createAccount = useCallback(
    async (data: Omit<Account, "id" | "userId" | "createdAt">) => {
      if (!uid) throw new Error("Not authenticated");
      const account = await addAccount(uid, data);
      setAccounts((prev) => [...prev, account]);
      return account;
    },
    [uid]
  );

  const editAccount = useCallback(
    async (
      id: string,
      data: Partial<Omit<Account, "id" | "userId" | "createdAt">>
    ) => {
      await updateAccount(id, data);
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...data } : a))
      );
    },
    []
  );

  const removeAccount = useCallback(async (id: string) => {
    await deleteAccount(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ── Category CRUD ─────────────────────────────────────────────────────────

  const createCategory = useCallback(
    async (data: Omit<Category, "id" | "userId">) => {
      if (!uid) throw new Error("Not authenticated");
      const cat = await addCategory(uid, data);
      setCategories((prev) => [...prev, cat]);
      return cat;
    },
    [uid]
  );

  const editCategory = useCallback(
    async (id: string, data: Partial<Omit<Category, "id" | "userId">>) => {
      await updateCategory(id, data);
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...data } : c))
      );
    },
    []
  );

  const removeCategory = useCallback(async (id: string) => {
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reorderCategoryItems = useCallback(async (ids: string[]) => {
    setCategories((prev) =>
      prev.map((c) => {
        const idx = ids.indexOf(c.id);
        return idx !== -1 ? { ...c, sortOrder: idx } : c;
      })
    );
    await reorderCategories(ids);
  }, []);

  // ── Transaction CRUD ──────────────────────────────────────────────────────

  const createTransaction = useCallback(
    async (data: Omit<Transaction, "id" | "userId" | "createdAt">) => {
      if (!uid) throw new Error("Not authenticated");
      const tx = await addTransaction(uid, data);
      setTransactions((prev) => [tx, ...prev]);

      // Update account balance(s)
      setAccounts((prev) =>
        prev.map((acc) => {
          if (data.type === "expense" && acc.id === data.accountId)
            return { ...acc, balance: acc.balance - data.amount };
          if (data.type === "income" && acc.id === data.accountId)
            return { ...acc, balance: acc.balance + data.amount };
          if (data.type === "transfer") {
            if (acc.id === data.accountId)
              return { ...acc, balance: acc.balance - data.amount };
            if (acc.id === data.toAccountId)
              return { ...acc, balance: acc.balance + data.amount };
          }
          return acc;
        })
      );

      // Persist balance changes to Firestore
      if (data.type === "expense" || data.type === "income") {
        const acc = accounts.find((a) => a.id === data.accountId);
        if (acc) {
          const newBalance =
            data.type === "income"
              ? acc.balance + data.amount
              : acc.balance - data.amount;
          await updateAccount(data.accountId, { balance: newBalance });
        }
      } else if (data.type === "transfer") {
        const from = accounts.find((a) => a.id === data.accountId);
        const to = accounts.find((a) => a.id === data.toAccountId);
        if (from) await updateAccount(data.accountId, { balance: from.balance - data.amount });
        if (to && data.toAccountId) await updateAccount(data.toAccountId, { balance: to.balance + data.amount });
      }

      return tx;
    },
    [uid, accounts]
  );

  const editTransaction = useCallback(
    async (
      id: string,
      data: Partial<Omit<Transaction, "id" | "userId" | "createdAt">>
    ) => {
      const old = transactions.find((t) => t.id === id);
      await updateTransaction(id, data);
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...data } : t))
      );

      if (!old) return;
      const updated = { ...old, ...data };

      // Revert old balance effect then apply new
      const balanceChanges: Record<string, number> = {};

      const revert = (tx: Transaction, factor: 1 | -1) => {
        if (tx.type === "expense") balanceChanges[tx.accountId] = (balanceChanges[tx.accountId] ?? 0) + factor * tx.amount;
        if (tx.type === "income") balanceChanges[tx.accountId] = (balanceChanges[tx.accountId] ?? 0) - factor * tx.amount;
        if (tx.type === "transfer") {
          balanceChanges[tx.accountId] = (balanceChanges[tx.accountId] ?? 0) + factor * tx.amount;
          if (tx.toAccountId) balanceChanges[tx.toAccountId] = (balanceChanges[tx.toAccountId] ?? 0) - factor * tx.amount;
        }
      };

      revert(old, 1);    // undo old
      revert(updated, -1); // apply new

      setAccounts((prev) =>
        prev.map((acc) =>
          balanceChanges[acc.id] !== undefined
            ? { ...acc, balance: acc.balance + balanceChanges[acc.id] }
            : acc
        )
      );

      for (const [accId, delta] of Object.entries(balanceChanges)) {
        if (delta === 0) continue;
        const acc = accounts.find((a) => a.id === accId);
        if (acc) await updateAccount(accId, { balance: acc.balance + delta });
      }
    },
    [transactions, accounts]
  );

  const removeTransaction = useCallback(async (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    await deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    if (!tx) return;

    // Revert account balance(s)
    setAccounts((prev) =>
      prev.map((acc) => {
        if (tx.type === "expense" && acc.id === tx.accountId)
          return { ...acc, balance: acc.balance + tx.amount };
        if (tx.type === "income" && acc.id === tx.accountId)
          return { ...acc, balance: acc.balance - tx.amount };
        if (tx.type === "transfer") {
          if (acc.id === tx.accountId)
            return { ...acc, balance: acc.balance + tx.amount };
          if (acc.id === tx.toAccountId)
            return { ...acc, balance: acc.balance - tx.amount };
        }
        return acc;
      })
    );

    // Persist to Firestore
    if (tx.type === "expense" || tx.type === "income") {
      const acc = accounts.find((a) => a.id === tx.accountId);
      if (acc) {
        const newBalance =
          tx.type === "expense"
            ? acc.balance + tx.amount
            : acc.balance - tx.amount;
        await updateAccount(tx.accountId, { balance: newBalance });
      }
    } else if (tx.type === "transfer") {
      const from = accounts.find((a) => a.id === tx.accountId);
      const to = accounts.find((a) => a.id === tx.toAccountId);
      if (from) await updateAccount(tx.accountId, { balance: from.balance + tx.amount });
      if (to && tx.toAccountId) await updateAccount(tx.toAccountId, { balance: to.balance - tx.amount });
    }
  }, [transactions, accounts]);

  // ── Debt CRUD ─────────────────────────────────────────────────────────────

  const createDebt = useCallback(
    async (data: Omit<Debt, "id" | "userId" | "createdAt">) => {
      if (!uid) throw new Error("Not authenticated");
      const debt = await addDebt(uid, data);
      setDebts((prev) => [debt, ...prev]);
      return debt;
    },
    [uid]
  );

  const editDebt = useCallback(
    async (id: string, data: Partial<Omit<Debt, "id" | "userId" | "createdAt">>) => {
      await updateDebt(id, data);
      setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    },
    []
  );

  const removeDebt = useCallback(async (id: string) => {
    await deleteDebt(id);
    setDebts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // ── Profile ───────────────────────────────────────────────────────────────

  const saveUserProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      if (!uid) throw new Error("Not authenticated");
      await updateUserProfile(uid, data);
      setUserProfile((prev) => (prev ? { ...prev, ...data } : null));
    },
    [uid]
  );

  return (
    <AppContext.Provider
      value={{
        accounts,
        categories,
        transactions,
        userProfile,
        loadingAccounts,
        loadingCategories,
        loadingTransactions,
        loadingProfile,
        refreshAccounts,
        createAccount,
        editAccount,
        removeAccount,
        refreshCategories,
        createCategory,
        editCategory,
        removeCategory,
        reorderCategoryItems,
        refreshTransactions,
        createTransaction,
        editTransaction,
        removeTransaction,
        debts,
        loadingDebts,
        refreshDebts,
        createDebt,
        editDebt,
        removeDebt,
        refreshProfile,
        saveUserProfile,
        isImpersonating,
        impersonate,
        stopImpersonating,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
