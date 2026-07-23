import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';

// This is Firebase's public, client-side project configuration - it is
// designed to be embedded in browser bundles and is NOT a secret (Firebase's
// own docs confirm this: https://firebase.google.com/docs/projects/api-keys).
// It only lets a browser start a Google sign-in flow; deciding whether that
// signed-in account is actually allowed into the admin dashboard happens
// server-side (see lib/adminAuth.js + lib/firebaseAdmin.js), never here.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export function getFirebaseAuth() {
  const app = getApps()[0] || initializeApp(firebaseConfig);
  return getAuth(app);
}

export function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  // Always show the account chooser instead of silently reusing the last
  // Google session - avoids someone else's already-open browser profile
  // accidentally signing into the admin panel.
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}
