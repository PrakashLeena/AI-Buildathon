// Very lightweight in-memory rate limiter for serverless API routes.
//
// CAVEAT: each serverless function instance (Vercel, etc.) has its own
// memory, and instances are frequently recycled/cold-started or scaled
// horizontally - so this does NOT provide a hard, globally-consistent rate
// limit the way a shared store (e.g. Upstash Redis) would. It DOES
// meaningfully slow down naive scripted abuse hitting a warm instance
// repeatedly, which - combined with the CAPTCHA already required on the
// registration form - is a reasonable, dependency-free layer for this
// site's threat model. If abuse becomes a real problem in practice, swap
// this for a shared store keyed the same way.
const buckets = new Map();

// Opportunistic cleanup so `buckets` never grows unbounded across the
// lifetime of a warm serverless instance.
function sweep(now) {
  if (buckets.size < 5000) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Fixed-window rate limiter keyed by an arbitrary string (e.g.
 * `registrations:203.0.113.5`). Call once per incoming request.
 *
 * @param {string} key
 * @param {number} limit - max requests allowed within `windowMs`
 * @param {number} windowMs
 * @returns {{ limited: boolean, retryAfterSeconds: number }}
 */
export function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  sweep(now);

  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }

  entry.count += 1;

  if (entry.count > limit) {
    return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  return { limited: false, retryAfterSeconds: 0 };
}
