export { getClientIp } from './requestIp.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifies a Cloudflare Turnstile token server-side. This is the only place
 * TURNSTILE_SECRET_KEY is used - it must never be sent to the browser.
 *
 * @param {string} token - the token produced by the client-side widget
 *   (sent up as `captchaToken` in the request body).
 * @param {string} [remoteIp] - the visitor's IP, optional but recommended by
 *   Cloudflare for stronger validation.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function verifyTurnstileToken(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error('[verifyTurnstile] TURNSTILE_SECRET_KEY is not configured.');
    return { success: false, error: 'CAPTCHA is not configured on the server.' };
  }

  if (!token || typeof token !== 'string') {
    return { success: false, error: 'CAPTCHA verification is required.' };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.append('remoteip', remoteIp);

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body });
    const outcome = await res.json();

    if (!outcome.success) {
      console.warn('[verifyTurnstile] verification failed:', outcome['error-codes']);
      return { success: false, error: 'CAPTCHA verification failed. Please try again.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[verifyTurnstile] request to Cloudflare failed:', err);
    return { success: false, error: 'Could not verify CAPTCHA right now. Please try again.' };
  }
}
