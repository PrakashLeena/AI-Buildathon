import { applyCors } from '../../../lib/cors.js';
import { checkRateLimit } from '../../../lib/rateLimit.js';
import { getClientIp } from '../../../lib/requestIp.js';
import { isSupabaseConfigured, supabaseAdmin } from '../../../lib/supabaseAdmin.js';
import { verifyOtpToken } from '../../../lib/otpToken.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT = { max: 15, windowMs: 10 * 60 * 1000 };

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`final-submit-verify:${clientIp}`, RATE_LIMIT.max, RATE_LIMIT.windowMs);
  if (rate.limited) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many verification attempts. Please try again later.' });
  }

  const { email, otp, otpToken } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  // Verify OTP
  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
    return res.status(400).json({ error: 'Please enter the 6-digit verification code.' });
  }
  if (!otpToken || typeof otpToken !== 'string') {
    return res.status(400).json({ error: 'Please request a verification code first.' });
  }

  const otpCheck = verifyOtpToken(otpToken, cleanEmail, otp.trim());
  if (!otpCheck.valid) {
    return res.status(400).json({ error: otpCheck.error || 'Invalid or expired verification code.' });
  }

  if (!isSupabaseConfigured) {
    return res.status(503).json({ error: 'Database service is not available.' });
  }

  try {
    const { data: rows, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('id, full_name, student_email, members, team_name');

    if (regError) {
      console.error('[api/project-submissions/verify-email] lookup error:', regError.message);
      return res.status(500).json({ error: 'Could not verify registration. Please try again.' });
    }

    let registrationId = null;
    let participantName = null;
    let teamName = null;

    for (const row of rows || []) {
      if (String(row.student_email || '').trim().toLowerCase() === cleanEmail) {
        registrationId = row.id;
        participantName = row.full_name;
        teamName = row.team_name;
        break;
      }
      const members = Array.isArray(row.members) ? row.members : [];
      const matched = members.find((m) => String(m?.email || '').trim().toLowerCase() === cleanEmail);
      if (matched) {
        registrationId = row.id;
        participantName = matched.name;
        teamName = row.team_name;
        break;
      }
    }

    if (!registrationId) {
      return res.status(403).json({
        error: 'This email is not registered with any team. Only registered participants can submit a project.'
      });
    }

    // Check if submission exists
    const { data: existingSub, error: subError } = await supabaseAdmin
      .from('project_submissions')
      .select('id')
      .eq('registration_id', registrationId)
      .maybeSingle();

    if (subError) {
      console.error('[api/project-submissions/verify-email] submission check error:', subError.message);
    }

    return res.status(200).json({
      success: true,
      registrationId,
      participantName,
      participantEmail: cleanEmail,
      teamName,
      hasExistingSubmission: !!existingSub,
      otp: otp.trim(),
      otpToken
    });
  } catch (error) {
    console.error('[api/project-submissions/verify-email] error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
