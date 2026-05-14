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

export async function deleteCycleStart(uid: string, cycleKey: string): Promise<void> {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, { [`cycleStarts.${cycleKey}`]: deleteField() });
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
    balance: Math.round(data.balance * 100) / 100,
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
  const payload = data.balance !== undefined
    ? { ...data, balance: Math.round(data.balance * 100) / 100 }
    : data;
  await updateDoc(doc(db, "accounts", id), payload);
}

export async function deleteAccount(id: string): Promise<void> {
  await deleteDoc(doc(db, "accounts", id));
}

export async function reorderAccounts(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, index) => updateDoc(doc(db, "accounts", id), { sortOrder: index }))
  );
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

export async function getTransactions(userId: string, maxDocs = 500): Promise<Transaction[]> {
  const q = query(
    collection(db, "transactions"),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    orderBy("createdAt", "desc"),
    limit(maxDocs)
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
    if (key in data && payload[key] === undefined) payload[key] = deleteField();
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

export async function getUserStats(userId: string): Promise<{ transactions: number; accounts: number }> {
  const [txSnap, accSnap] = await Promise.all([
    getDocs(query(collection(db, "transactions"), where("userId", "==", userId))),
    getDocs(query(collection(db, "accounts"), where("userId", "==", userId))),
  ]);
  return { transactions: txSnap.size, accounts: accSnap.size };
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
  const collections = ["accounts", "categories", "transactions", "debts", "insights", "activities"] as const;
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
  options: { cycleStarts?: Record<string, string> } = {}
): { start: Date; end: Date } {
  const { cycleStarts } = options;
  const today = referenceDate;
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();

  // Auto-computed boundaries (used as map keys and fallbacks)
  const autoCycleStart: Date = day >= salaryDay
    ? new Date(year, month, salaryDay)
    : new Date(year, month - 1, salaryDay);
  const autoNextStart = new Date(autoCycleStart.getFullYear(), autoCycleStart.getMonth() + 1, salaryDay);

  // Apply manual override for this cycle
  let cycleStart = autoCycleStart;
  if (cycleStarts) {
    const key = format(autoCycleStart, "yyyy-MM-dd");
    const manual = cycleStarts[key];
    if (manual) {
      const manualDate = parseISO(manual);
      const window = { start: addDays(autoCycleStart, -7), end: addDays(autoCycleStart, 7) };
      if (isWithinInterval(manualDate, window)) {
        cycleStart = manualDate;
      }
    }
  }

  // Cycle ends the day before the next cycle's actual start
  let cycleEnd = addDays(autoNextStart, -1);
  if (cycleStarts) {
    const nextKey = format(autoNextStart, "yyyy-MM-dd");
    const nextManual = cycleStarts[nextKey];
    if (nextManual) {
      const nextManualDate = parseISO(nextManual);
      const window = { start: addDays(autoNextStart, -7), end: addDays(autoNextStart, 7) };
      if (isWithinInterval(nextManualDate, window)) {
        cycleEnd = addDays(nextManualDate, -1);
      }
    }
  }

  return { start: startOfDay(cycleStart), end: endOfDay(cycleEnd) };
}

export async function getSalaryCycleTransactions(
  userId: string,
  salaryDay: number,
  referenceDate: Date = new Date(),
  options: { cycleStarts?: Record<string, string> } = {}
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

// ─── Insights ─────────────────────────────────────────────────────────────────

export interface StoredInsight {
  userId: string;
  hash: string;
  summary: string;
  dos: string[];
  donts: string[];
  generatedAt: Timestamp;
}

export async function getInsight(uid: string): Promise<StoredInsight | null> {
  const ref = doc(db, "insights", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as StoredInsight;
}

export async function saveInsight(uid: string, hash: string, summary: string, dos: string[], donts: string[]): Promise<void> {
  const ref = doc(db, "insights", uid);
  await setDoc(ref, { userId: uid, hash, summary, dos, donts, generatedAt: Timestamp.now() });
}

// ─── Partnerships ─────────────────────────────────────────────────────────────

import type { Partnership } from "./types";

export async function sendPartnerInvite(
  inviterUid: string,
  inviterEmail: string,
  inviterName: string | null,
  inviteeEmail: string
): Promise<Partnership> {
  const data = {
    inviterUid,
    inviterEmail,
    inviterName,
    inviteeEmail: inviteeEmail.trim().toLowerCase(),
    status: "pending" as const,
    createdAt: Timestamp.now(),
  };
  const ref = await addDoc(collection(db, "partnerships"), data);
  await setDoc(doc(db, "users", inviterUid), { partnershipId: ref.id }, { merge: true });
  return { id: ref.id, ...data };
}

export async function getPartnershipForInviter(uid: string): Promise<Partnership | null> {
  const q = query(
    collection(db, "partnerships"),
    where("inviterUid", "==", uid),
    where("status", "in", ["pending", "active"])
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Partnership;
}

export async function getPartnershipForInvitee(email: string): Promise<Partnership | null> {
  const q = query(
    collection(db, "partnerships"),
    where("inviteeEmail", "==", email.trim().toLowerCase()),
    where("status", "in", ["pending", "active"])
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Partnership;
}

export async function acceptPartnership(
  partnershipId: string,
  inviteeUid: string,
  inviteeName?: string | null
): Promise<void> {
  const update: Record<string, unknown> = { inviteeUid, status: "active", acceptedAt: Timestamp.now() };
  if (inviteeName) update.inviteeName = inviteeName;
  await updateDoc(doc(db, "partnerships", partnershipId), update);
  await setDoc(doc(db, "users", inviteeUid), { partnershipId }, { merge: true });
}

export async function declinePartnership(partnershipId: string): Promise<void> {
  const ref = doc(db, "partnerships", partnershipId);
  const snap = await getDoc(ref);
  const data = snap.data();
  await deleteDoc(ref);
  if (data?.inviterUid) {
    await setDoc(doc(db, "notifications", data.inviterUid), { partnerDeclined: true }, { merge: true });
  }
}

export async function stopPartnership(
  partnershipId: string,
  callerUid: string
): Promise<void> {
  const ref = doc(db, "partnerships", partnershipId);
  await deleteDoc(ref);
  await setDoc(doc(db, "users", callerUid), { partnershipId: deleteField() }, { merge: true });
}

export async function getPartnerDeclinedNotification(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "notifications", uid));
  return snap.exists() && snap.data()?.partnerDeclined === true;
}

export async function clearPartnerDeclinedFlag(uid: string): Promise<void> {
  await deleteDoc(doc(db, "notifications", uid));
}

export async function updatePartnershipName(
  partnershipId: string,
  role: "inviter" | "invitee",
  name: string
): Promise<void> {
  const field = role === "inviter" ? "inviterName" : "inviteeName";
  await updateDoc(doc(db, "partnerships", partnershipId), { [field]: name });
}

// ─── Demo seed ────────────────────────────────────────────────────────────────

export const DEMO_UID = process.env.NEXT_PUBLIC_DEMO_UID ?? "";

export async function clearAndSeedDemoData(): Promise<void> {
  const uid = DEMO_UID;

  // Clear all collections except user profile
  const cols = ["accounts", "categories", "transactions", "debts", "insights", "activities"] as const;
  for (const col of cols) {
    const snap = await getDocs(query(collection(db, col), where("userId", "==", uid)));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }

  // Update user profile with salary day
  await setDoc(doc(db, "users", uid), {
    salaryDay: 25,
    hideBalance: false,
    categoriesSeeded: true,
    categoriesSeedVersion: 3,
  }, { merge: true });

  // Account — balance will be set to net amount after all transactions
  const accountRef = await addDoc(collection(db, "accounts"), {
    userId: uid,
    name: "Maybank",
    type: "bank",
    balance: 1469.42,
    createdAt: Timestamp.now(),
    sortOrder: 0,
  });
  const accId = accountRef.id;

  // ── Categories ────────────────────────────────────────────────────────────

  // L1: Needs
  const needsRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Needs", level: 1, parentId: null, type: "needs",
  });
  // Budgets live on L3 — the budget page derives L2 totals by summing L3 children
  const foodRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Food & Drinks", level: 2, parentId: needsRef.id, type: "needs", sortOrder: 0,
  });
  const transportRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Transport", level: 2, parentId: needsRef.id, type: "needs", sortOrder: 1,
  });
  const housingRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Housing", level: 2, parentId: needsRef.id, type: "needs", sortOrder: 2,
  });
  const healthRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Health", level: 2, parentId: needsRef.id, type: "needs", sortOrder: 3,
  });
  // L3 — Food (budget 600 total: 350+150+100)
  const groceriesRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Groceries", level: 3, parentId: foodRef.id, type: "needs",
    budget: 350, budgetType: "cycle", sortOrder: 0,
  });
  const restaurantRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Restaurant", level: 3, parentId: foodRef.id, type: "needs",
    budget: 150, budgetType: "cycle", sortOrder: 1,
  });
  const deliveryRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Food Delivery", level: 3, parentId: foodRef.id, type: "needs",
    budget: 100, budgetType: "cycle", sortOrder: 2,
  });
  // L3 — Transport (budget 300 total: 250+50)
  const fuelRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Fuel", level: 3, parentId: transportRef.id, type: "needs",
    budget: 250, budgetType: "cycle", sortOrder: 0,
  });
  const publicTransportRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Public Transport", level: 3, parentId: transportRef.id, type: "needs",
    budget: 50, budgetType: "cycle", sortOrder: 1,
  });
  // L3 — Housing (budget 1500 total: 1200+300)
  const rentRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Rent", level: 3, parentId: housingRef.id, type: "needs",
    budget: 1200, budgetType: "cycle", sortOrder: 0,
  });
  const utilitiesRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Utilities", level: 3, parentId: housingRef.id, type: "needs",
    budget: 300, budgetType: "cycle", sortOrder: 1,
  });
  // L3 — Health (budget 200 total: 80+120)
  const medicineRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Medicine", level: 3, parentId: healthRef.id, type: "needs",
    budget: 80, budgetType: "cycle", sortOrder: 0,
  });
  const doctorRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Doctor", level: 3, parentId: healthRef.id, type: "needs",
    budget: 120, budgetType: "cycle", sortOrder: 1,
  });

  // L1: Wants
  const wantsRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Wants", level: 1, parentId: null, type: "wants",
  });
  const entertainRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Entertainment", level: 2, parentId: wantsRef.id, type: "wants", sortOrder: 0,
  });
  const shoppingRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Shopping", level: 2, parentId: wantsRef.id, type: "wants", sortOrder: 1,
  });
  const subsRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Subscriptions", level: 2, parentId: wantsRef.id, type: "wants", sortOrder: 2,
  });
  // L3 — Entertainment (budget 200 total: 100+100)
  const moviesRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Movies", level: 3, parentId: entertainRef.id, type: "wants",
    budget: 100, budgetType: "cycle", sortOrder: 0,
  });
  const gamesRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Games", level: 3, parentId: entertainRef.id, type: "wants",
    budget: 100, budgetType: "cycle", sortOrder: 1,
  });
  // L3 — Shopping (budget 500; Electronics has no budget → unbudgeted spending showcase)
  const clothesRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Clothes", level: 3, parentId: shoppingRef.id, type: "wants",
    budget: 500, budgetType: "cycle", sortOrder: 0,
  });
  const electronicsRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Electronics", level: 3, parentId: shoppingRef.id, type: "wants", sortOrder: 1,
  });
  // L3 — Subscriptions (budget 100 total: 60+40)
  const streamingRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Streaming", level: 3, parentId: subsRef.id, type: "wants",
    budget: 60, budgetType: "cycle", sortOrder: 0,
  });
  const musicRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Music", level: 3, parentId: subsRef.id, type: "wants",
    budget: 40, budgetType: "cycle", sortOrder: 1,
  });

  // L1: Savings
  const savingsL1Ref = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Savings", level: 1, parentId: null, type: "savings",
  });
  const emergencyL2Ref = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Emergency Fund", level: 2, parentId: savingsL1Ref.id, type: "savings", sortOrder: 0,
  });
  const emergencyRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Contribution", level: 3, parentId: emergencyL2Ref.id, type: "savings",
    budget: 500, budgetType: "cycle", sortOrder: 0,
  });
  const investL2Ref = await addDoc(collection(db, "categories"), {
    userId: uid, name: "Investments", level: 2, parentId: savingsL1Ref.id, type: "savings", sortOrder: 1,
  });
  const investRef = await addDoc(collection(db, "categories"), {
    userId: uid, name: "ASB", level: 3, parentId: investL2Ref.id, type: "savings",
    budget: 361.18, budgetType: "cycle", sortOrder: 0,
  });

  // ── Transactions (cycle: Apr 25 – May 24, 2026) ────────────────────────────

  const tx = (type: string, amount: number, date: string, categoryId: string | null, note?: string) =>
    addDoc(collection(db, "transactions"), {
      userId: uid,
      type,
      amount,
      date,
      accountId: accId,
      ...(categoryId ? { categoryId } : {}),
      ...(note ? { note } : {}),
      createdAt: Timestamp.now(),
    });

  // Income
  await tx("income", 6200.00, "2026-04-25", null, "Salary");

  // Food & Drinks — budget 600, spend 762.50 → over by 162.50
  await tx("expense", 180.00, "2026-04-26", groceriesRef.id, "Mydin");
  await tx("expense",  95.00, "2026-04-30", restaurantRef.id, "Family dinner");
  await tx("expense",  45.00, "2026-05-02", deliveryRef.id, "GrabFood");
  await tx("expense", 165.00, "2026-05-04", groceriesRef.id, "Monthly groceries");
  await tx("expense",  68.00, "2026-05-07", restaurantRef.id, "Lunch");
  await tx("expense",  32.00, "2026-05-09", deliveryRef.id, "Foodpanda");
  await tx("expense",  90.00, "2026-05-12", groceriesRef.id, "Aeon top-up");
  await tx("expense",  87.50, "2026-05-13", restaurantRef.id, "Dinner");

  // Transport — budget 300, spend 260.00 → under
  await tx("expense", 120.00, "2026-04-27", fuelRef.id, "Shell");
  await tx("expense",  45.00, "2026-05-03", fuelRef.id, "RapidKL");
  await tx("expense",  95.00, "2026-05-08", fuelRef.id, "Petronas");

  // Housing — budget 1500, spend 1345.00 → under
  await tx("expense", 1200.00, "2026-04-25", rentRef.id, "April rent");
  await tx("expense",  145.00, "2026-05-01", utilitiesRef.id, "TNB + Unifi");

  // Health — budget 200, spend 285.00 → over by 85
  await tx("expense",  85.00, "2026-05-04", medicineRef.id, "Guardian pharmacy");
  await tx("expense", 200.00, "2026-05-09", doctorRef.id, "Klinik panel");

  // Entertainment — budget 200, spend 95.00 → under
  await tx("expense",  60.00, "2026-04-28", moviesRef.id, "GSC TGV");
  await tx("expense",  35.00, "2026-05-06", gamesRef.id, "Steam sale");

  // Shopping — budget 500, spend 530.00 → over by 30
  await tx("expense", 320.00, "2026-05-01", clothesRef.id, "Uniqlo");
  await tx("expense", 210.00, "2026-05-11", clothesRef.id, "Zara sale");

  // Subscriptions — budget 100, spend 72.90 → under
  await tx("expense",  55.00, "2026-04-26", streamingRef.id, "Netflix");
  await tx("expense",  17.90, "2026-05-01", musicRef.id, "Spotify");

  // Savings — budget 500, spend 500 → exactly met
  await tx("expense", 500.00, "2026-04-25", emergencyRef.id, "Monthly savings");

  // Investments — budget 361.18, spend 361.18 → exactly met
  await tx("expense", 361.18, "2026-05-01", investRef.id, "ASB top-up");

  // Unbudgeted — Electronics has no budget so these show as "Unbudgeted spending"
  await tx("expense", 120.00, "2026-04-29", electronicsRef.id, "Car charger");
  await tx("expense", 200.00, "2026-05-05", electronicsRef.id, "Keyboard");
  await tx("expense", 199.00, "2026-05-10", electronicsRef.id, "Phone case + accessories");
}
