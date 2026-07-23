import { firebaseAdminAuth, isFirebaseAdminConfigured } from './firebaseAdmin.js';

export const SESSION_COOKIE_NAME = 'admin_session';
// 5 days - long enough to be convenient, short enough to limit exposure if a
// device/browser profile is ever compromised. Re-authenticating after this
// is a single Google-account click, not a real burden.
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

function parseAllowlist() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminAllowlistConfigured() {
  return parseAllowlist().length > 0;
}

/** Case-insensitive check against the ADMIN_EMAILS allowlist env var. */
export function isEmailAllowed(email) {
  if (!email) return false;
  return parseAllowlist().includes(String(email).toLowerCase());
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (!key) return;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  });
  return out;
}

/**
 * Verifies the admin session cookie on an incoming request (works for both
 * API route handlers and `getServerSideProps`, since both receive `req`).
 *
 * Returns the decoded Firebase token (with `.email`, `.uid`, ...) only if
 * ALL of the following hold - otherwise returns `null` and never throws:
 *   1. A session cookie is present.
 *   2. It's a valid, non-revoked Firebase session cookie.
 *   3. Its email is verified.
 *   4. Its email is present on the ADMIN_EMAILS allowlist RIGHT NOW (so
 *      revoking access just means editing one env var - no token cleanup).
 */
export async function getAdminFromRequest(req) {
  if (!isFirebaseAdminConfigured) return null;

  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies[SESSION_COOKIE_NAME];
  if (!sessionCookie) return null;

  try {
    // `checkRevoked: true` also rejects sessions belonging to a since-deleted
    // or since-disabled Google account.
    const decoded = await firebaseAdminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded.email || !decoded.email_verified) return null;
    if (!isEmailAllowed(decoded.email)) return null;
    return decoded;
  } catch {
    return null;
  }
}

function cookieAttributes(maxAgeSeconds) {
  const parts = ['Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSeconds}`];
  // Secure requires HTTPS - always true on Vercel, but would block the
  // cookie entirely on plain-HTTP localhost, so only add it in production.
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts;
}

export function buildSessionCookie(value) {
  return [`${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`, ...cookieAttributes(Math.floor(SESSION_MAX_AGE_MS / 1000))].join(
    '; '
  );
}

export function buildClearedSessionCookie() {
  return [`${SESSION_COOKIE_NAME}=`, ...cookieAttributes(0)].join('; ');
}
