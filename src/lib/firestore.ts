import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  deleteField,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Account, Activity, ActivityType, Category, Transaction, UserProfile, Debt } from "./types";
import { format, startOfDay, endOfDay, parseISO, isWithinInterval, addDays } from "date-fns";

// ─── Default category seed ───────────────────────────────────────────────────

const DEFAULT_CATEGORIES: {
  name: string;
  type: "needs" | "wants" | "savings";
  children: { name: string; items?: string[] }[];
}[] = [
  {
    name: "Needs",
    type: "needs",
    children: [
      { name: "Food & Drinks", items: ["Groceries", "Restaurant", "Cafe", "Food Delivery"] },
      { name: "Transport", items: ["Fuel", "Public Transport", "Parking & Toll"] },
      { name: "Utilities", items: ["Electricity", "Water", "Internet", "Phone"] },
      { name: "Housing", items: ["Rent", "Maintenance"] },
      { name: "Health", items: ["Medicine", "Doctor", "Dental"] },
      { name: "Insurance & Takaful", items: ["Life", "Medical", "Car Insurance"] },
      { name: "Education", items: ["Tuition", "School Fees", "Books"] },
      { name: "Personal Care", items: ["Haircut", "Toiletries", "Laundry"] },
      { name: "Baby & Kids", items: ["Diapers & Formula", "Childcare", "School Supplies"] },
      { name: "Zakat & Sedekah", items: ["Zakat Pendapatan", "Zakat Fitrah", "Zakat Harta", "Sedekah"] },
      { name: "Debt Repayment", items: ["Personal", "Bank Loan", "PTPTN", "Hire Purchase", "Credit Card"] },
    ],
  },
  {
    name: "Wants",
    type: "wants",
    children: [
      { name: "Entertainment", items: ["Movies", "Games", "Concerts"] },
      { name: "Subscriptions", items: ["Streaming", "Music", "Apps", "News"] },
      { name: "Shopping", items: ["Clothes", "Electronics", "Home Decor"] },
      { name: "Beauty", items: ["Salon", "Spa", "Skincare"] },
      { name: "Sports & Fitness", items: ["Gym", "Sports Gear"] },
      { name: "Gifts", items: ["Birthday", "Wedding", "Donations"] },
      { name: "Holidays", items: ["Flights", "Hotel", "Activities"] },
      { name: "Pet Care", items: ["Pet Food", "Vet", "Grooming"] },
    ],
  },
  {
    name: "Savings",
    type: "savings",
    children: [
      { name: "Emergency Fund", items: ["Contribution", "Top Up"] },
      { name: "Investments", items: ["ASB", "Unit Trust", "Stocks"] },
      { name: "Goals", items: ["House", "Car", "Travel", "Education", "Wedding"] },
      { name: "Money Lent", items: [] },
    ],
  },
];

export async function seedDefaultCategories(uid: string): Promise<void> {
  for (const l1Def of DEFAULT_CATEGORIES) {
    const l1 = await addDoc(collection(db, "categories"), {
      name: l1Def.name,
      level: 1,
      parentId: null,
      type: l1Def.type,
      userId: uid,
    });

    for (let l2i = 0; l2i < l1Def.children.length; l2i++) {
      const l2Def = l1Def.children[l2i];
      const l2 = await addDoc(collection(db, "categories"), {
        name: l2Def.name,
        level: 2,
        parentId: l1.id,
        type: l1Def.type,
        userId: uid,
        sortOrder: l2i,
      });

      for (let l3i = 0; l3i < (l2Def.items ?? []).length; l3i++) {
        await addDoc(collection(db, "categories"), {
          name: l2Def.items![l3i],
          level: 3,
          parentId: l2.id,
          type: l1Def.type,
          userId: uid,
          sortOrder: l3i,
        });
      }
    }
  }
}

// Idempotent version — only adds what's missing. Safe to call on every login.
export async function ensureDefaultCategories(uid: string): Promise<void> {
  const existing = await getCategories(uid);

  for (const l1Def of DEFAULT_CATEGORIES) {
    let l1 = existing.find((c) => c.level === 1 && c.type === l1Def.type);

    if (!l1) {
      const ref = await addDoc(collection(db, "categories"), {
        name: l1Def.name,
        level: 1,
        parentId: null,
        type: l1Def.type,
        userId: uid,
      });
      l1 = { id: ref.id, userId: uid, name: l1Def.name, level: 1, parentId: null, type: l1Def.type };
      existing.push(l1);
    }

    for (let l2i = 0; l2i < l1Def.children.length; l2i++) {
      const l2Def = l1Def.children[l2i];
      let l2 = existing.find(
        (c) => c.level === 2 && c.parentId === l1!.id && c.name === l2Def.name
      );

      if (!l2) {
        const ref = await addDoc(collection(db, "categories"), {
          name: l2Def.name,
          level: 2,
          parentId: l1.id,
          type: l1Def.type,
          userId: uid,
          sortOrder: l2i,
        });
        l2 = { id: ref.id, userId: uid, name: l2Def.name, level: 2, parentId: l1.id, type: l1Def.type, sortOrder: l2i };
        existing.push(l2);
      }

      const existingL3Names = existing
        .filter((c) => c.level === 3 && c.parentId === l2!.id)
        .map((c) => c.name);

      for (let l3i = 0; l3i < (l2Def.items ?? []).length; l3i++) {
        const itemName = l2Def.items![l3i];
        if (!existingL3Names.includes(itemName)) {
          const ref = await addDoc(collection(db, "categories"), {
            name: itemName,
            level: 3,
            parentId: l2.id,
            type: l1Def.type,
            userId: uid,
            sortOrder: l3i,
          });
          existing.push({ id: ref.id, userId: uid, name: itemName, level: 3, parentId: l2.id, type: l1Def.type, sortOrder: l3i });
        }
      }
    }
  }
}

// Targeted one-time migration — only adds "Debt Repayment" under Needs if absent.
// Never re-adds anything the user already deleted.
export async function applySeedV2(uid: string): Promise<void> {
  const existing = await getCategories(uid);
  const needsL1 = existing.find((c) => c.level === 1 && c.type === "needs");
  if (!needsL1) return;

  const hasDebtRepayment = existing.some(
    (c) => c.level === 2 && c.parentId === needsL1.id && c.name === "Debt Repayment"
  );
  if (hasDebtRepayment) return;

  const l2Ref = await addDoc(collection(db, "categories"), {
    name: "Debt Repayment",
    level: 2,
    parentId: needsL1.id,
    type: "needs",
    userId: uid,
    sortOrder: 99,
  });
  const items = ["Personal", "Bank Loan", "PTPTN", "Hire Purchase", "Credit Card"];
  for (let i = 0; i < items.length; i++) {
    await addDoc(collection(db, "categories"), {
      name: items[i],
      level: 3,
      parentId: l2Ref.id,
      type: "needs",
      userId: uid,
      sortOrder: i,
    });
  }
}

// Targeted one-time migration — only adds "Money Lent" under Savings if absent.
export async function applySeedV3(uid: string): Promise<void> {
  const existing = await getCategories(uid);
  const savingsL1 = existing.find((c) => c.level === 1 && c.type === "savings");
  if (!savingsL1) return;

  const hasMoneyLent = existing.some(
    (c) => c.level === 2 && c.parentId === savingsL1.id && c.name === "Money Lent"
  );
  if (hasMoneyLent) return;

  await addDoc(collection(db, "categories"), {
    name: "Money Lent",
    level: 2,
    parentId: savingsL1.id,
    type: "savings",
    userId: uid,
    sortOrder: 99,
  });
}

// ─── User Profile ────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, "users", uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  const docRef = doc(db, "users", uid);
  await setDoc(docRef, { uid, ...data }, { merge: true });
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data() as UserProfile);
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function getAccounts(userId: string): Promise<Account[]> {
  const q = query(
    collection(db, "accounts"),
    where("userId", "==", userId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Account));
}

export async function addAccount(
  userId: string,
  data: Omit<Account, "id" | "userId" | "createdAt">
): Promise<Account> {
  const payload = {
    ...data,
    userId,
    createdAt: Timestamp.now(),
  };
  const ref = await addDoc(collection(db, "accounts"), payload);
  return { id: ref.id, ...payload } as Account;
}

export async function updateAccount(
  id: string,
  data: Partial<Omit<Account, "id" | "userId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "accounts", id), data);
}

export async function deleteAccount(id: string): Promise<void> {
  await deleteDoc(doc(db, "accounts", id));
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getCategories(userId: string): Promise<Category[]> {
  const q = query(
    collection(db, "categories"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
}

export async function addCategory(
  userId: string,
  data: Omit<Category, "id" | "userId">
): Promise<Category> {
  // Strip undefined optional fields — Firestore rejects them
  const payload: Record<string, unknown> = { userId };
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) payload[k] = v;
  }
  const ref = await addDoc(collection(db, "categories"), payload);
  return { id: ref.id, ...payload } as Category;
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<Category, "id" | "userId">>
): Promise<void> {
  // Replace undefined optional fields with deleteField() so Firestore doesn't reject them
  const payload: Record<string, unknown> = { ...data };
  for (const key of ["budget", "budgetType", "budgetDays", "budgetSelectedDates", "note", "links", "color"] as const) {
    if (payload[key] === undefined) payload[key] = deleteField();
  }
  await updateDoc(doc(db, "categories", id), payload);
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(userId: string): Promise<Transaction[]> {
  const q = query(
    collection(db, "transactions"),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
}

export async function addTransaction(
  userId: string,
  data: Omit<Transaction, "id" | "userId" | "createdAt">
): Promise<Transaction> {
  const payload: Record<string, unknown> = { userId, createdAt: Timestamp.now() };
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) payload[k] = v;
  }
  const ref = await addDoc(collection(db, "transactions"), payload);
  return { id: ref.id, ...payload } as Transaction;
}

export async function updateTransaction(
  id: string,
  data: Partial<Omit<Transaction, "id" | "userId" | "createdAt">>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    payload[k] = v === undefined ? deleteField() : v;
  }
  await updateDoc(doc(db, "transactions", id), payload);
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, "transactions", id));
}

export async function reorderCategories(
  ids: string[]
): Promise<void> {
  await Promise.all(
    ids.map((id, index) => updateDoc(doc(db, "categories", id), { sortOrder: index }))
  );
}

// ─── Debts ────────────────────────────────────────────────────────────────────

export async function getDebts(userId: string): Promise<Debt[]> {
  const q = query(
    collection(db, "debts"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Debt));
}

export async function addDebt(
  userId: string,
  data: Omit<Debt, "id" | "userId" | "createdAt">
): Promise<Debt> {
  const payload: Record<string, unknown> = { userId, createdAt: Timestamp.now() };
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) payload[k] = v;
  }
  const ref = await addDoc(collection(db, "debts"), payload);
  return { id: ref.id, ...payload } as Debt;
}

export async function updateDebt(
  id: string,
  data: Partial<Omit<Debt, "id" | "userId" | "createdAt">>
): Promise<void> {
  const payload: Record<string, unknown> = { ...data };
  for (const key of ["note", "dueDate", "settledDate", "accountId", "transactionLinked"] as const) {
    if (payload[key] === undefined) payload[key] = deleteField();
  }
  await updateDoc(doc(db, "debts", id), payload);
}

export async function deleteDebt(id: string): Promise<void> {
  await deleteDoc(doc(db, "debts", id));
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function logActivity(
  userId: string,
  type: ActivityType,
  description: string
): Promise<void> {
  await addDoc(collection(db, "activities"), {
    userId,
    type,
    description,
    timestamp: Timestamp.now(),
  });
}

/** Latest 50 activities across all users — for admin global feed. */
export async function getRecentActivities(n = 50): Promise<Activity[]> {
  const q = query(
    collection(db, "activities"),
    orderBy("timestamp", "desc"),
    limit(n)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity));
}

/** Latest activities for a single user — for admin per-user drill-down. */
export async function getUserActivities(userId: string, n = 20): Promise<Activity[]> {
  const q = query(
    collection(db, "activities"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(n)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity));
}

export async function deleteAllUserData(uid: string): Promise<void> {
  const collections = ["accounts", "categories", "transactions", "debts"] as const;
  for (const col of collections) {
    const q = query(collection(db, col), where("userId", "==", uid));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
  await deleteDoc(doc(db, "users", uid));
}

/**
 * Returns transactions within the current salary cycle.
 * If salaryDay = 25 and today is March 25, cycle is 25 Mar – 24 Apr.
 * If today is March 10, cycle is 25 Feb – 24 Mar.
 */
export function getSalaryCycleRange(
  salaryDay: number,
  referenceDate: Date = new Date(),
  options: { graceDays?: number; manualCycleStart?: string } = {}
): { start: Date; end: Date } {
  const { graceDays = 0, manualCycleStart } = options;
  const today = referenceDate;
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();

  // Shift the threshold earlier by grace days so salary arriving early still
  // falls into the new cycle.
  const threshold = Math.max(salaryDay - graceDays, 1);

  let cycleStart: Date;
  let cycleEnd: Date;

  if (day >= threshold) {
    cycleStart = new Date(year, month, threshold);
    cycleEnd = new Date(year, month + 1, threshold - 1);
  } else {
    cycleStart = new Date(year, month - 1, threshold);
    cycleEnd = new Date(year, month, threshold - 1);
  }

  // Manual override: if the user tapped "salary received" and that date falls
  // within ±7 days of the auto-calculated cycle start, honour it.
  if (manualCycleStart) {
    const manual = parseISO(manualCycleStart);
    const window = {
      start: addDays(cycleStart, -7),
      end: addDays(cycleStart, 7),
    };
    if (isWithinInterval(manual, window)) {
      cycleStart = manual;
    }
  }

  return { start: startOfDay(cycleStart), end: endOfDay(cycleEnd) };
}

export async function getSalaryCycleTransactions(
  userId: string,
  salaryDay: number,
  referenceDate: Date = new Date(),
  options: { graceDays?: number; manualCycleStart?: string } = {}
): Promise<Transaction[]> {
  const { start, end } = getSalaryCycleRange(salaryDay, referenceDate, options);
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  const q = query(
    collection(db, "transactions"),
    where("userId", "==", userId),
    where("date", ">=", startStr),
    where("date", "<=", endStr),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
}
