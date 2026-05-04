/**
 * Seed script for demo partnership between Husband and Wife accounts.
 *
 * Prerequisites:
 *   1. Download a service account key from Firebase Console:
 *      Project Settings → Service accounts → Generate new private key
 *   2. Save it as scripts/serviceAccount.json (gitignored)
 *   3. npm install firebase-admin  (one-time, dev only)
 *   4. node scripts/seed-demo.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const serviceAccount = require(join(__dirname, "serviceAccount.json"));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── Config ──────────────────────────────────────────────────────────────────

const HUSBAND = {
  uid: "vHZ4PJnqRWNdp26XHoufu3UcQtC2",
  email: "mustafasyahmi98@gmail.com",
  displayName: "Husband",
  salaryDay: 25,
};

const WIFE = {
  uid: "z6zy1opuXIfkUQubcF14Llc9g3x1",
  email: "mustafasyahmi31@gmail.com",
  displayName: "Wife",
  salaryDay: 25,
};

// Current cycle: April 25 – May 24 2026
const CYCLE_DATES = [
  "2026-04-25", "2026-04-26", "2026-04-27", "2026-04-28", "2026-04-29",
  "2026-04-30", "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04",
];

// ─── Category seed ────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  {
    name: "Needs", type: "needs",
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
    name: "Wants", type: "wants",
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
    name: "Savings", type: "savings",
    children: [
      { name: "Emergency Fund", items: ["Contribution", "Top Up"] },
      { name: "Investments", items: ["ASB", "Unit Trust", "Stocks"] },
      { name: "Goals", items: ["House", "Car", "Travel", "Education", "Wedding"] },
      { name: "Money Lent", items: [] },
    ],
  },
];

async function seedCategories(uid) {
  const catMap = {}; // name -> id, for quick lookup when creating transactions

  for (const l1Def of DEFAULT_CATEGORIES) {
    const l1Ref = await db.collection("categories").add({
      name: l1Def.name, level: 1, parentId: null, type: l1Def.type, userId: uid,
    });
    catMap[l1Def.name] = l1Ref.id;

    for (let i = 0; i < l1Def.children.length; i++) {
      const l2Def = l1Def.children[i];
      const l2Ref = await db.collection("categories").add({
        name: l2Def.name, level: 2, parentId: l1Ref.id, type: l1Def.type, userId: uid, sortOrder: i,
      });
      catMap[l2Def.name] = l2Ref.id;

      for (let j = 0; j < l2Def.items.length; j++) {
        const l3Ref = await db.collection("categories").add({
          name: l2Def.items[j], level: 3, parentId: l2Ref.id, type: l1Def.type, userId: uid, sortOrder: j,
        });
        catMap[l2Def.items[j]] = l3Ref.id;
      }
    }
  }

  return catMap;
}

// ─── Seed one user ────────────────────────────────────────────────────────────

async function seedUser(user, accountDefs, txDefs) {
  console.log(`\nSeeding ${user.displayName} (${user.uid})...`);

  // User profile
  await db.collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: null,
    salaryDay: user.salaryDay,
    hideBalance: false,
    categoriesSeeded: true,
    categoriesSeedVersion: 3,
    lastLogin: Timestamp.now(),
  }, { merge: true });
  console.log("  ✓ User profile");

  // Accounts
  const accountIds = {};
  for (const acc of accountDefs) {
    const ref = await db.collection("accounts").add({
      userId: user.uid,
      name: acc.name,
      type: acc.type,
      balance: acc.balance,
      createdAt: Timestamp.now(),
      sortOrder: acc.sortOrder,
    });
    accountIds[acc.key] = ref.id;
  }
  console.log(`  ✓ ${accountDefs.length} accounts`);

  // Categories
  const catMap = await seedCategories(user.uid);
  console.log("  ✓ Categories");

  // Transactions
  for (const tx of txDefs) {
    const payload = {
      userId: user.uid,
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      accountId: accountIds[tx.accountKey],
      createdAt: Timestamp.now(),
    };
    if (tx.categoryName) payload.categoryId = catMap[tx.categoryName] ?? null;
    if (tx.note) payload.note = tx.note;
    await db.collection("transactions").add(payload);
  }
  console.log(`  ✓ ${txDefs.length} transactions`);

  return { accountIds, catMap };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Husband data ──
  const husbandAccounts = [
    { key: "maybank", name: "Maybank", type: "bank", balance: 3540.50, sortOrder: 0 },
    { key: "tng", name: "Touch 'n Go", type: "ewallet", balance: 87.30, sortOrder: 1 },
    { key: "cash", name: "Cash", type: "cash", balance: 120.00, sortOrder: 2 },
  ];

  const husbandTx = [
    { type: "income",   amount: 4200,   date: "2026-04-25", accountKey: "maybank", categoryName: null,           note: "Gaji April" },
    { type: "expense",  amount: 180.50, date: "2026-04-25", accountKey: "maybank", categoryName: "Rent",          note: "Sewa rumah" },
    { type: "expense",  amount: 45.00,  date: "2026-04-26", accountKey: "tng",     categoryName: "Fuel",          note: "Minyak kereta" },
    { type: "expense",  amount: 28.80,  date: "2026-04-27", accountKey: "maybank", categoryName: "Groceries",     note: "Giant" },
    { type: "expense",  amount: 12.50,  date: "2026-04-28", accountKey: "tng",     categoryName: "Food Delivery", note: "GrabFood" },
    { type: "expense",  amount: 89.00,  date: "2026-04-29", accountKey: "maybank", categoryName: "Electricity",   note: "TNB bil" },
    { type: "expense",  amount: 55.00,  date: "2026-04-30", accountKey: "maybank", categoryName: "Internet",      note: "Unifi" },
    { type: "expense",  amount: 16.00,  date: "2026-05-01", accountKey: "tng",     categoryName: "Parking & Toll",note: "Lebuhraya" },
    { type: "expense",  amount: 35.00,  date: "2026-05-02", accountKey: "maybank", categoryName: "Groceries",     note: "Pasar malam" },
    { type: "expense",  amount: 22.00,  date: "2026-05-03", accountKey: "cash",    categoryName: "Restaurant",    note: "Makan tengah hari" },
    { type: "expense",  amount: 200.00, date: "2026-05-04", accountKey: "maybank", categoryName: "ASB",           note: "Simpanan bulanan" },
  ];

  // ── Wife data ──
  const wifeAccounts = [
    { key: "cimb",  name: "CIMB",  type: "bank",    balance: 2814.00, sortOrder: 0 },
    { key: "boost", name: "Boost", type: "ewallet", balance: 62.50,   sortOrder: 1 },
  ];

  const wifeTx = [
    { type: "income",   amount: 3500,   date: "2026-04-25", accountKey: "cimb",  categoryName: null,          note: "Gaji April" },
    { type: "expense",  amount: 63.40,  date: "2026-04-25", accountKey: "cimb",  categoryName: "Groceries",   note: "Jaya Grocer" },
    { type: "expense",  amount: 19.90,  date: "2026-04-26", accountKey: "boost", categoryName: "Streaming",   note: "Netflix" },
    { type: "expense",  amount: 38.00,  date: "2026-04-27", accountKey: "cimb",  categoryName: "Salon",       note: "Trim rambut" },
    { type: "expense",  amount: 14.50,  date: "2026-04-28", accountKey: "boost", categoryName: "Food Delivery",note: "Foodpanda" },
    { type: "expense",  amount: 52.00,  date: "2026-04-29", accountKey: "cimb",  categoryName: "Toiletries",  note: "Watson" },
    { type: "expense",  amount: 29.00,  date: "2026-04-30", accountKey: "cimb",  categoryName: "Medicine",    note: "Farmasi Guardian" },
    { type: "expense",  amount: 120.00, date: "2026-05-01", accountKey: "cimb",  categoryName: "Clothes",     note: "H&M" },
    { type: "expense",  amount: 11.00,  date: "2026-05-02", accountKey: "boost", categoryName: "Cafe",        note: "Kopi pagi" },
    { type: "expense",  amount: 45.00,  date: "2026-05-03", accountKey: "cimb",  categoryName: "Skincare",    note: "The Ordinary" },
    { type: "expense",  amount: 300.00, date: "2026-05-04", accountKey: "cimb",  categoryName: "Contribution",note: "Tabung kecemasan" },
  ];

  await seedUser(HUSBAND, husbandAccounts, husbandTx);
  await seedUser(WIFE, wifeAccounts, wifeTx);

  // ── Partnership (Husband invited Wife, already active) ──
  console.log("\nCreating active partnership...");
  const partnershipRef = await db.collection("partnerships").add({
    inviterUid: HUSBAND.uid,
    inviterEmail: HUSBAND.email,
    inviterName: HUSBAND.displayName,
    inviteeEmail: WIFE.email,
    inviteeUid: WIFE.uid,
    inviteeName: WIFE.displayName,
    status: "active",
    createdAt: Timestamp.now(),
    acceptedAt: Timestamp.now(),
  });

  await db.collection("users").doc(HUSBAND.uid).set({ partnershipId: partnershipRef.id }, { merge: true });
  await db.collection("users").doc(WIFE.uid).set({ partnershipId: partnershipRef.id }, { merge: true });

  console.log(`  ✓ Partnership created (${partnershipRef.id})`);
  console.log("\nDone! Both accounts are seeded and linked as partners.");
}

main().catch((err) => { console.error(err); process.exit(1); });
