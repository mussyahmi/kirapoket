/**
 * One-off cleanup: delete legacy "login" activity entries. Login logging was
 * removed back in April 2026 (lastLogin on the profile covers "when active"),
 * so these rows are dead noise in the admin feed.
 *
 *   node scripts/purge-login-activities.mjs           # dry run (counts only)
 *   node scripts/purge-login-activities.mjs --delete  # actually delete
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(readFileSync("scripts/serviceAccount.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const doDelete = process.argv.includes("--delete");

async function main() {
  const snap = await db.collection("activities").where("type", "==", "login").get();
  console.log(`Found ${snap.size} "login" activity entries.`);

  if (!doDelete) {
    console.log('Dry run. Re-run with --delete to remove them.');
    return;
  }

  let batch = db.batch();
  let n = 0;
  let total = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    n++;
    total++;
    if (n === 450) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
  console.log(`Deleted ${total} login activities.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
