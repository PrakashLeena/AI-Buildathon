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
      }
    ];
  }
};

module.exports = nextConfig;
