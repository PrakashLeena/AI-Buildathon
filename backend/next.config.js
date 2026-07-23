function corsHeaders() {
  const origin = (process.env.FRONTEND_ORIGIN || '*').replace(/\/+$/, '');
  const headers = [
    { key: 'Access-Control-Allow-Origin', value: origin },
    { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
  ];
  // Same rule as lib/cors.js: never pair credentials with a wildcard origin.
  if (origin !== '*') {
    headers.unshift({ key: 'Access-Control-Allow-Credentials', value: 'true' });
  }
  return headers;
}

// Baseline security headers applied to every response from this app
// (public API + /admin dashboard). Kept deliberately non-restrictive where
// tightening could break functionality (no CSP here - see the dedicated,
// narrower CSP below for /admin/:path* only, where we control every script/
// style source and can verify what's actually needed).
function baselineSecurityHeaders() {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    // Vercel always serves over HTTPS; this just tells browsers to remember
    // that and skip the initial plain-HTTP round trip on future visits.
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }
  ];
}

// Locked-down CSP for the /admin dashboard only - the one place this app
// renders real HTML/JS to a browser with anything worth protecting (a
// session-authenticated view of registration data). Scoped narrowly instead
// of applied site-wide so it doesn't risk breaking the unrelated JSON API
// routes or the plain informational page at "/".
//
// Allowances beyond 'self' are for Firebase Authentication's Google
// sign-in popup flow used on /admin/login:
//   - script-src apis.google.com: gapi loader Firebase Auth uses for popup sign-in.
//   - connect-src identitytoolkit/securetoken.googleapis.com: Firebase Auth REST calls.
//   - frame-src the Firebase authDomain: hidden iframe Firebase Auth uses for
//     cross-tab session/token state (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN).
// NOTE: verify /admin/login still works after deploying this - if the
// browser console shows a CSP violation for a domain not listed here, add
// it to the relevant directive below.
function adminCsp() {
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
  const frameSrc = ["'self'", 'https://accounts.google.com', authDomain && `https://${authDomain}`]
    .filter(Boolean)
    .join(' ');

  const directives = [
    "default-src 'self'",
    "script-src 'self' https://apis.google.com",
    "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com",
    `frame-src ${frameSrc}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "style-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ];
  return [{ key: 'Content-Security-Policy', value: directives.join('; ') }];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This backend serves the public JSON API (consumed by the separate
  // React/Vite frontend) plus a same-origin-only /admin dashboard. Only the
  // public routes get cross-origin CORS headers for the frontend's origin -
  // /api/admin/* is deliberately excluded so the frontend's origin (or any
  // other origin) is never granted credentialed cross-origin access to
  // admin data, even in principle. (The admin session cookie is also
  // SameSite=Strict, which independently blocks it from ever being sent
  // cross-site - this is defense-in-depth on top of that.)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: baselineSecurityHeaders()
      },
      {
        source: '/api/health',
        headers: corsHeaders()
      },
      {
        source: '/api/registrations/:path*',
        headers: corsHeaders()
      },
      {
        // Firebase's signInWithPopup() polls `popup.closed` on the Google
        // sign-in popup window to detect when it's dismissed. Vercel (and
        // some browsers by default) apply a strict Cross-Origin-Opener-Policy
        // that blocks that check across the popup boundary, breaking the
        // sign-in flow. `same-origin-allow-popups` keeps the isolation
        // benefits for same-origin content while explicitly allowing this
        // interaction with popups we open ourselves.
        source: '/admin/:path*',
        headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }, ...adminCsp()]
      }
    ];
  }
};

module.exports = nextConfig;
