import crypto from 'crypto';

// Stateless OTP scheme: instead of storing pending codes in a database, the
// server hands the client an HMAC-signed token that encodes WHO the code was
// sent to and WHEN it expires. The 6-digit code itself is never inside the
// token - only an HMAC that can't be recomputed without both the code and
// the server secret. This survives serverless cold starts / multiple
// instances, where in-memory storage would silently lose pending codes.
//
// Token format (dot-separated, all base64url/hex):
//   payloadB64 . payloadMac . otpMac
//     payload    = { email, exp }            (public, readable by client)
//     payloadMac = HMAC(secret, payloadB64)  (proves WE issued this token)
//     otpMac     = HMAC(secret, payloadB64 + "|" + otp)
//                  (verifiable only when the user supplies the right code)

export const OTP_EXPIRY_MINUTES = 10;

function getSecret() {
  // Fall back to the Supabase service key so the feature still works if
  // OTP_TOKEN_SECRET wasn't provisioned - it's equally secret and stable.
  return process.env.OTP_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function hmac(input) {
  return crypto.createHmac('sha256', getSecret()).update(input).digest('hex');
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/** Cryptographically random 6-digit code, zero-padded. */
export function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Issues a signed token binding `email` + expiry + the (hashed) OTP.
 * @param {string} email - already trimmed + lowercased
 * @param {string} otp
 */
export function createOtpToken(email, otp) {
  const exp = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
  const payloadB64 = Buffer.from(JSON.stringify({ email, exp })).toString('base64url');
  const payloadMac = hmac(payloadB64);
  const otpMac = hmac(`${payloadB64}|${otp}`);
  return `${payloadB64}.${payloadMac}.${otpMac}`;
}

function parseToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [payloadB64, payloadMac, otpMac] = parts;
  if (!safeEqual(hmac(payloadB64), payloadMac)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload || typeof payload.email !== 'string' || typeof payload.exp !== 'number') {
      return null;
    }
    return { payload, payloadB64, otpMac };
  } catch {
    return null;
  }
}

/**
 * Full verification: token authenticity, email match, expiry and the OTP
 * itself. Returns { valid: true } or { valid: false, error }.
 */
export function verifyOtpToken(token, email, otp) {
  const parsed = parseToken(token);
  if (!parsed) {
    return { valid: false, error: 'Email verification is invalid. Please request a new code.' };
  }
  if (parsed.payload.email !== String(email || '').trim().toLowerCase()) {
    return { valid: false, error: 'The verification code was sent to a different email address. Please request a new code.' };
  }
  if (Date.now() > parsed.payload.exp) {
    return { valid: false, error: 'Your verification code has expired. Please request a new one.' };
  }
  const submitted = String(otp || '').trim();
  if (!/^\d{6}$/.test(submitted) || !safeEqual(hmac(`${parsed.payloadB64}|${submitted}`), parsed.otpMac)) {
    return { valid: false, error: 'Incorrect verification code. Please check your inbox and try again.' };
  }
  return { valid: true };
}

/**
 * Signature-only check (expiry ignored, OTP not needed). Used to authorise
 * a "resend code" request without a fresh CAPTCHA: a valid signature proves
 * the ORIGINAL send for this email already passed the CAPTCHA.
 */
export function isTokenIssuedByUs(token, email) {
  const parsed = parseToken(token);
  return Boolean(parsed && parsed.payload.email === String(email || '').trim().toLowerCase());
}

/**
 * Creates a signed submission session token valid for `expiryMinutes` (default 60 mins).
 * Allows the user to fill and submit the final deliverables without re-verifying OTP.
 */
export function createSubmissionSessionToken(email, registrationId, expiryMinutes = 60) {
  const exp = Date.now() + expiryMinutes * 60 * 1000;
  const payloadB64 = Buffer.from(
    JSON.stringify({
      email: String(email || '').trim().toLowerCase(),
      registrationId: String(registrationId || '').trim(),
      exp
    })
  ).toString('base64url');
  const payloadMac = hmac(payloadB64);
  return `${payloadB64}.${payloadMac}`;
}

/**
 * Verifies a submission session token.
 * Validates HMAC signature, expiration time, and email/registrationId match.
 */
export function verifySubmissionSessionToken(token, email, registrationId) {
  if (typeof token !== 'string') return { valid: false, error: 'Invalid session token.' };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, error: 'Malformed session token.' };

  const [payloadB64, payloadMac] = parts;
  if (!safeEqual(hmac(payloadB64), payloadMac)) {
    return { valid: false, error: 'Session signature verification failed.' };
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload || typeof payload.exp !== 'number') {
      return { valid: false, error: 'Corrupted session token.' };
    }
    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Your submission session has expired. Please verify your email again.' };
    }
    if (payload.email !== String(email || '').trim().toLowerCase()) {
      return { valid: false, error: 'Session email mismatch.' };
    }
    if (registrationId && payload.registrationId && payload.registrationId !== String(registrationId).trim()) {
      return { valid: false, error: 'Session registration mismatch.' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Could not parse session token.' };
  }
}
