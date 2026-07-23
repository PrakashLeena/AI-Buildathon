/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This backend is API-only: the frontend (a separate React/Vite app)
  // consumes these routes over HTTP. All Supabase/database access lives
  // here, never in the browser bundle.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: (process.env.FRONTEND_ORIGIN || '*').replace(/\/+$/, '') },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
