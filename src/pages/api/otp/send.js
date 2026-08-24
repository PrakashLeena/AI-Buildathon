import { applyCors } from '../../../lib/cors.js';
import { checkRateLimit } from '../../../lib/rateLimit.js';
import { getClientIp } from '../../../lib/requestIp.js';
import { isEmailConfigured, sendOtpEmail } from '../../../lib/email.js';
import {
  OTP_EXPIRY_MINUTES,
  createOtpToken,
  generateOtp,
  isTokenIssuedByUs
} from '../../../lib/otpToken.js';
import { findAlreadyRegistered } from '../../../lib/participantLookup.js';
import { isSupabaseConfigured, supabaseAdmin } from '../../../lib/supabaseAdmin.js';
import { verifyTurnstileToken } from '../../../lib/verifyTurnstile.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// TESTING ONLY (OTP_TEST_MODE=true): no email is sent and the fixed code
// 000000 is accepted, so the whole registration flow can be exercised
// without a working mail setup. Also skips the CAPTCHA for scripted tests.
const isTestMode = () => process.env.OTP_TEST_MODE === 'true';
const TEST_OTP = '000000';

// Per-IP and per-mailbox caps. The mailbox cap is the important one - it
// stops the endpoint being abused to flood a victim's inbox even from many
// different IPs (within what a warm instance can see - see lib/rateLimit.js).
const IP_LIMIT = { max: 8, windowMs: 10 * 60 * 1000 };
const EMAIL_LIMIT = { max: 4, windowMs: 10 * 60 * 1000 };

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const clientIp = getClientIp(req);

  const ipRate = checkRateLimit(`otp-send:ip:${clientIp}`, IP_LIMIT.max, IP_LIMIT.windowMs);
  if (ipRate.limited) {
    res.setHeader('Retry-After', String(ipRate.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many verification requests. Please try again later.' });
  }

  const { email, full_name, captchaToken, previousToken, company_website: honeypot } = req.body || {};

  // Three purposes share this endpoint:
  //   "register" (default)   - the email must NOT already be registered.
  //   "edit"                 - the email MUST belong to an existing team leader.
  //   "submission"           - for project brief submissions (participant verification).
  const rawMode = req.body?.mode;
  const mode = rawMode === 'edit' ? 'edit' : rawMode === 'submission' ? 'submission' : 'register';

  // Same honeypot as the registration endpoint - bots that fill every field
  // reveal themselves here before we spend an email send.
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    console.warn(`[api/otp/send] honeypot triggered from ${clientIp}`);
    return res.status(400).json({ error: 'Invalid submission.' });
  }

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanName = typeof full_name === 'string' ? full_name.trim() : '';

  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  // In edit or submission mode, full name is optional.
  if (mode === 'register' && (!cleanName || cleanName.length > 150)) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  const emailRate = checkRateLimit(`otp-send:email:${cleanEmail}`, EMAIL_LIMIT.max, EMAIL_LIMIT.windowMs);
  if (emailRate.limited) {
    res.setHeader('Retry-After', String(emailRate.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many codes requested for this email. Please try again later.' });
  }

  // Turnstile tokens are single-use, so a "Resend code" click can't reuse
  // the one spent on the first send. Instead, a resend is authorised by the
  // previously issued OTP token: its valid signature proves the ORIGINAL
  // send for this same email already passed the CAPTCHA.
  const isAuthorisedResend = previousToken && isTokenIssuedByUs(previousToken, cleanEmail);
  if (!isAuthorisedResend && !isTestMode() && mode !== 'submission') {
    const captchaResult = await verifyTurnstileToken(captchaToken, clientIp);
    if (!captchaResult.success) {
      return res.status(400).json({ error: captchaResult.error });
    }
  }

  if (!isEmailConfigured() && !isTestMode()) {
    console.error('[api/otp/send] RESEND_API_KEY is not configured.');
    return res.status(503).json({ error: 'Email verification is not available right now. Please try again later.' });
  }

  let recipientName = cleanName || 'Participant';

  if (mode === 'edit') {
    // Editing requires an existing registration where this email is the
    // LEADER - members can't edit, and unknown emails get a clear error
    // before any code is sent.
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'This service is not available right now. Please try again later.' });
    }
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('registrations')
      .select('full_name')
      .eq('student_email', cleanEmail)
      .maybeSingle();
    if (lookupError) {
      console.error('[api/otp/send] leader lookup failed:', lookupError.message);
      return res.status(500).json({ error: 'Could not look up your registration. Please try again.' });
    }
    if (!existing) {
      return res.status(404).json({
        error: 'No registration found with this email as team leader. Only the team leader can edit team details.'
      });
    }
    recipientName = existing.full_name;
  } else if (mode === 'submission') {
    // Submissions are strictly for registered teams only (registration period closed).
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: 'This service is not available right now. Please try again later.' });
    }
    const { data: rows, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('team_name, full_name, student_email, members');

    if (regError) {
      console.error('[api/otp/send] submission lookup error:', regError.message);
      return res.status(500).json({ error: 'Could not verify registration. Please try again.' });
    }

    let isRegistered = false;
    for (const row of rows || []) {
      if (String(row.student_email || '').trim().toLowerCase() === cleanEmail) {
        recipientName = row.full_name || 'Participant';
        isRegistered = true;
        break;
      }
      const members = Array.isArray(row.members) ? row.members : [];
      const matched = members.find((m) => String(m?.email || '').trim().toLowerCase() === cleanEmail);
      if (matched) {
        recipientName = matched.name || 'Participant';
        isRegistered = true;
        break;
      }
    }

    if (!isRegistered) {
      return res.status(403).json({
        error: 'This email is not registered with any team. Registration has closed, and brief submissions are open only to registered teams.'
      });
    }
  } else if (mode === 'register' && isSupabaseConfigured) {
    // Catch already-registered leaders BEFORE the user goes through the whole
    // OTP dance, instead of failing at the very end of the flow. One person =
    // one team, so being a member of another team also blocks registering.
    try {
      const conflict = await findAlreadyRegistered([{ email: cleanEmail, label: 'This email' }]);
      if (conflict) {
        return res.status(409).json({
          error: `This email is already registered with team "${conflict.teamName}". Each person can only be part of one team.`
        });
      }
    } catch (err) {
      // Non-fatal: worst case the duplicate is caught at registration time.
      console.warn('[api/otp/send] duplicate pre-check failed:', err.message);
    }
  }

  if (isTestMode()) {
    console.warn(`[api/otp/send] OTP_TEST_MODE active - no email sent to ${cleanEmail}, accepting fixed code ${TEST_OTP}.`);
    return res.status(200).json({
      message: 'Test mode: no email sent. Use code 000000.',
      otpToken: createOtpToken(cleanEmail, TEST_OTP),
      expiresInMinutes: OTP_EXPIRY_MINUTES
    });
  }

  try {
    const otp = generateOtp();
    await sendOtpEmail({
      to: cleanEmail,
      fullName: recipientName,
      otp,
      expiryMinutes: OTP_EXPIRY_MINUTES
    });

    return res.status(200).json({
      message: 'Verification code sent.',
      otpToken: createOtpToken(cleanEmail, otp),
      expiresInMinutes: OTP_EXPIRY_MINUTES
    });
  } catch (err) {
    console.error('[api/otp/send] failed to send OTP email:', err);
    return res.status(502).json({ error: 'Could not send the verification email. Please try again.' });
  }
}
