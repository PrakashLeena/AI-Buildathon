// Small CORS helper shared by every API route. The frontend is a separate
// app (different origin in production), so each response needs explicit
// CORS headers and OPTIONS preflight requests must be answered directly.
//
// Origins never include a trailing slash (e.g. "https://example.com", not
// "https://example.com/"). Strip one if present so a misconfigured env var
// doesn't silently break CORS by not matching the browser's Origin header.
const RAW_ORIGIN = process.env.FRONTEND_ORIGIN;
const ALLOWED_ORIGIN = (RAW_ORIGIN || '*').replace(/\/+$/, '');

if (!RAW_ORIGIN) {
  // Falling back to "*" is intentionally only a local-dev convenience.
  // Surface it loudly so it's never silently left wide-open in production.
  console.warn(
    '[cors] FRONTEND_ORIGIN is not set - defaulting to "*" (any origin allowed) on public API routes. ' +
      'Set FRONTEND_ORIGIN to your deployed frontend URL in production.'
  );
}

export function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Access-Control-Allow-Credentials: true is meaningless (and rejected by
  // browsers anyway) when paired with a wildcard origin - only send it
  // alongside a specific, real origin.
  if (ALLOWED_ORIGIN !== '*') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // signal to caller that the request was fully handled
  }

  return false;
}
