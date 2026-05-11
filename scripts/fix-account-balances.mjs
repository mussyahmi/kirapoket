/**
 * One-time migration: round all account balances to 2 decimal places.
 *
 * Prerequisites:
 *   1. scripts/serviceAccount.json must exist (Firebase service account key)
 *   2. npm install firebase-admin  (if not already installed)
 *   3. node scripts/fix-account-balances.mjs
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(readFileSync("scripts/serviceAccount.json", "utf8"));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const round2 = (n) => Math.round(n * 100) / 100;

async function main() {
  const snap = await db.collection("accounts").get();
  let checked = 0;
  let fixed = 0;

  for (const docSnap of snap.docs) {
    const { balance } = docSnap.data();
    checked++;
    if (typeof balance !== "number") continue;

    const rounded = round2(balance);
    if (rounded !== balance) {
      console.log(`  ${docSnap.id}  ${balance} → ${rounded}`);
      await docSnap.ref.update({ balance: rounded });
      fixed++;
    }
  }

  console.log(`\nDone. Checked ${checked} accounts, fixed ${fixed}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
