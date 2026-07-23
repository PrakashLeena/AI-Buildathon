import { firebaseAdminAuth, isFirebaseAdminConfigured } from '../../../lib/firebaseAdmin.js';
import { SESSION_MAX_AGE_MS, buildSessionCookie, getAdminAllowlistConfigured, isEmailAllowed } from '../../../lib/adminAuth.js';
import { checkRateLimit } from '../../../lib/rateLimit.js';
import { getClientIp } from '../../../lib/requestIp.js';

// Exchanges a freshly-obtained Firebase Google sign-in ID token for a
// long-lived, httpOnly session cookie - but only for allowlisted admin
// emails. This is a same-origin-only endpoint (called from /admin/login by
// our own client JS), never intended to be hit cross-site.

// Defense-in-depth against scripted brute-forcing of this endpoint, on top
// of the fact that a valid Firebase ID token (which already requires a real
// Google sign-in) is required before the allowlist is even checked.
const LOGIN_RATE_LIMIT = { max: 20, windowMs: 15 * 60 * 1000 }; // 20 attempts / 15 min / IP

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const rate = checkRateLimit(`admin-session:${getClientIp(req)}`, LOGIN_RATE_LIMIT.max, LOGIN_RATE_LIMIT.windowMs);
  if (rate.limited) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many sign-in attempts. Please try again later.' });
  }

  // Defense-in-depth CSRF check on top of the SameSite=Strict cookie: reject
  // any request whose Origin doesn't match our own host.
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        return res.status(403).json({ error: 'Cross-origin requests are not allowed on this endpoint.' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid Origin header.' });
    }
  }

  if (!isFirebaseAdminConfigured) {
    console.error('[api/admin/session] Firebase Admin SDK is not configured.');
    return res.status(503).json({ error: 'Admin login is not configured yet.' });
  }

  if (!getAdminAllowlistConfigured()) {
    console.error('[api/admin/session] ADMIN_EMAILS allowlist is empty - refusing all admin logins.');
    return res.status(503).json({ error: 'Admin access has not been configured yet.' });
  }

  const { idToken } = req.body || {};
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ error: 'Missing idToken.' });
  }

  try {
    const decoded = await firebaseAdminAuth.verifyIdToken(idToken);

    if (!decoded.email || !decoded.email_verified) {
      return res.status(403).json({ error: 'Your Google account email is not verified.' });
    }

    if (!isEmailAllowed(decoded.email)) {
      console.warn(`[api/admin/session] rejected sign-in attempt from non-allowlisted email: ${decoded.email}`);
      return res.status(403).json({ error: 'This Google account is not authorized to access the admin dashboard.' });
    }

    const sessionCookie = await firebaseAdminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    res.setHeader('Set-Cookie', buildSessionCookie(sessionCookie));
    return res.status(200).json({ ok: true, email: decoded.email });
  } catch (err) {
    // err.code (e.g. "auth/argument-error", "auth/project-not-found") is the
    // most useful bit for diagnosing setup problems - almost always either a
    // FIREBASE_ADMIN_PROJECT_ID mismatch with the client config, or a
    // malformed FIREBASE_ADMIN_PRIVATE_KEY (common when copy-pasting into
    // Vercel's env var UI). Check the deployment's function logs for this
    // line when troubleshooting a 401 here.
    console.error('[api/admin/session] sign-in failed:', err.code || '(no code)', '-', err.message);
    return res.status(401).json({ error: 'Sign-in failed. Please try again.' });
  }
}
