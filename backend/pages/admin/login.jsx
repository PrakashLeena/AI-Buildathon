import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { getAdminFromRequest } from '../../lib/adminAuth.js';
import { createGoogleProvider, getFirebaseAuth } from '../../lib/firebaseClient.js';

export async function getServerSideProps({ req }) {
  // Already signed in? Skip straight to the dashboard.
  const admin = await getAdminFromRequest(req);
  if (admin) {
    return { redirect: { destination: '/admin', permanent: false } };
  }
  return { props: {} };
}

export default function AdminLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setError('');
    setLoading(true);

    let auth;
    try {
      auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, createGoogleProvider());
      const idToken = await result.user.getIdToken();

      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || 'Sign-in failed.');
      }

      await router.replace('/admin');
    } catch (err) {
      // Never leave an unapproved Google session lingering client-side.
      await signOut(auth || getFirebaseAuth()).catch(() => {});
      const message =
        err?.code === 'auth/popup-closed-by-user'
          ? 'Sign-in was cancelled.'
          : err?.message || 'Sign-in failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login — AI Buildathon</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="mx-auto mb-5 h-12 w-12 rounded-xl bg-brand-orange/10 border border-brand-orange/30 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5500" strokeWidth="2">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-1">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm text-center mb-8">AI Buildathon registrations</p>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold rounded-lg py-3 hover:bg-slate-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6 29.6 4 24 4 16.2 4 9.4 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.5C29.6 35.4 27 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.3 39.6 16.1 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.5C41.5 36.2 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5z"
              />
            </svg>
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </button>

          <p className="text-slate-500 text-xs text-center mt-6">Access is restricted to authorized admin accounts only.</p>
        </div>
      </div>
    </>
  );
}
