// Central API client. Every write/read the frontend needs goes through the
// Next.js backend - the frontend never imports Supabase or holds any DB
// credentials. In dev, Vite proxies `/api/*` to the backend (see
// vite.config.js); in production set VITE_API_BASE_URL to the deployed
// backend origin (e.g. https://api.yourdomain.com/api).
// Strip any trailing slash so `${API_BASE_URL}${path}` never produces a
// double slash (e.g. ".../api//registrations"), which Vercel/most hosts
// will redirect - and browsers refuse to follow a redirect on a CORS
// preflight (OPTIONS) request, causing a confusing CORS error instead of
// the real cause.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

/**
 * Submit a new team registration. All validation, Supabase Auth sign-up and
 * the `registrations` table insert happen server-side in the backend.
 */
export function registerTeam(payload) {
  return request('/registrations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
