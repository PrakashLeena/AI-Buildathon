import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Server-only credentials for the Firebase Admin SDK, used to verify Google
// sign-ins and issue/verify secure session cookies for the admin dashboard.
// These come from a Firebase service account (Firebase Console -> Project
// Settings -> Service Accounts -> Generate new private key) and must NEVER
// be exposed to the browser or committed to source control.
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
// Private keys stored in .env files / Vercel env vars usually have their
// real newlines escaped as the two characters "\n" - restore them here.
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

export const isFirebaseAdminConfigured = Boolean(projectId && clientEmail && privateKey);

if (!isFirebaseAdminConfigured) {
  console.warn(
    '[firebaseAdmin] Missing FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / ' +
      'FIREBASE_ADMIN_PRIVATE_KEY. Admin login will return 503 until these are set.'
  );
}

let app = null;
if (isFirebaseAdminConfigured) {
  app = getApps()[0] || initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

// Null when unconfigured - every caller MUST check `isFirebaseAdminConfigured`
// before using this, exactly like the Supabase admin client pattern.
export const firebaseAdminAuth = app ? getAuth(app) : null;
