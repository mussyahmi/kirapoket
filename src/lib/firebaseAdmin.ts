import {
  getApps,
  initializeApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Lazily initialise the Firebase Admin SDK for use in server routes.
 *
 * In the Firebase Hosting / Functions runtime, `initializeApp()` with no args
 * picks up Application Default Credentials automatically. For local dev you can
 * supply a service-account JSON via the FIREBASE_SERVICE_ACCOUNT env var.
 */
function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const svc = JSON.parse(raw);
    return initializeApp({
      credential: cert({
        projectId: svc.project_id,
        clientEmail: svc.client_email,
        // Handle escaped newlines from env storage
        privateKey: (svc.private_key as string)?.replace(/\\n/g, "\n"),
      }),
    });
  }

  // No service account: rely on Application Default Credentials (Functions
  // runtime) but pass the project ID explicitly so verifyIdToken works even in
  // local dev where ADC may be absent — token verification only needs the
  // project ID plus Google's public certs.
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return initializeApp(projectId ? { projectId } : undefined);
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
