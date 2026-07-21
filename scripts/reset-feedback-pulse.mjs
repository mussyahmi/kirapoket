/**
 * One-off: reset the feedback-pulse cooldown for a user so the pulse can show
 * again. Clears the `feedbackPrompt` field on their profile.
 *
 *   node scripts/reset-feedback-pulse.mjs [email]
 *
 * Defaults to the owner's email if none is passed.
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(readFileSync("scripts/serviceAccount.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const email = process.argv[2] || "claude@cpglobalinnovation.com";

async function main() {
  const snap = await db.collection("users").where("email", "==", email).get();
  if (snap.empty) {
    console.log(`No user found with email ${email}`);
    return;
  }
  for (const doc of snap.docs) {
    await doc.ref.update({ feedbackPrompt: admin.firestore.FieldValue.delete() });
    console.log(`Reset feedback pulse for ${email} (uid: ${doc.id})`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
