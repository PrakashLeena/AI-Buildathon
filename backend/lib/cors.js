// Small CORS helper shared by every API route. The frontend is a separate
// app (different origin in production), so each response needs explicit
// CORS headers and OPTIONS preflight requests must be answered directly.
//
// Origins never include a trailing slash (e.g. "https://example.com", not
// "https://example.com/"). Strip one if present so a misconfigured env var
// doesn't silently break CORS by not matching the browser's Origin header.
const ALLOWED_ORIGIN = (process.env.FRONTEND_ORIGIN || '*').replace(/\/+$/, '');

export function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // signal to caller that the request was fully handled
  }

  return false;
}
