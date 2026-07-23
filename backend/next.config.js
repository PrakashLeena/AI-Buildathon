function corsHeaders() {
  return [
    { key: 'Access-Control-Allow-Credentials', value: 'true' },
    { key: 'Access-Control-Allow-Origin', value: (process.env.FRONTEND_ORIGIN || '*').replace(/\/+$/, '') },
    { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
  ];
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
        headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }]
      }
    ];
  }
};

module.exports = nextConfig;
