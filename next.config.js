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
// Allowances beyond 'self':
//   - script-src apis.google.com + www.gstatic.com: Firebase/Google Auth loaders.
//   - script-src 'unsafe-inline': Firebase signInWithPopup injects inline helpers
//     (no nonce pipeline yet). Required in production, not only in dev.
//   - connect-src identitytoolkit/securetoken.googleapis.com: Firebase Auth REST.
//   - frame-src Firebase authDomain + accounts.google.com: Auth iframes/popups.
//   - style-src fonts.googleapis.com + font-src fonts.gstatic.com: site fonts
//     imported from styles.css (Plus Jakarta Sans / Rajdhani).
// Turnstile is loaded only by the registration widget, never on /admin.
// NOTE: verify /admin/login still works after deploying this - if the
// browser console shows a CSP violation for a domain not listed here, add
// it to the relevant directive below.
function adminCsp() {
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
  const frameSrc = ["'self'", 'https://accounts.google.com', authDomain && `https://${authDomain}`]
    .filter(Boolean)
    .join(' ');

  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    'https://apis.google.com',
    'https://www.gstatic.com',
    isDev && "'unsafe-eval'"
  ]
    .filter(Boolean)
    .join(' ');

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com",
    `frame-src ${frameSrc}`,
    "img-src 'self' data: https://www.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ];
  return [{ key: 'Content-Security-Policy', value: directives.join('; ') }];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The OTP/welcome email templates are plain .html files read from disk at
  // runtime (src/lib/email.js). Serverless bundlers only include files they
  // can statically trace, so explicitly include them for the routes that
  // send email - otherwise emails break in production with ENOENT.
  experimental: {
    outputFileTracingIncludes: {
      '/api/otp/send': ['./src/*.html'],
      '/api/registrations': ['./src/*.html']
    }
  },
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
        source: '/api/otp/:path*',
        headers: corsHeaders()
      },
      {
        source: '/api/submissions/:path*',
        headers: corsHeaders()
      },
      {
        source: '/api/submissions',
        headers: corsHeaders()
      },
      {
        source: '/api/teams',
        headers: corsHeaders()
      },
      {
        source: '/api/teams/:path*',
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
