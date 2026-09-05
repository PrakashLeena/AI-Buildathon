import { applyCors } from '../../../lib/cors.js';
import { verifyOtpToken } from '../../../lib/otpToken.js';
import { checkRateLimit } from '../../../lib/rateLimit.js';
import { getClientIp } from '../../../lib/requestIp.js';
import { isSupabaseConfigured, supabaseAdmin } from '../../../lib/supabaseAdmin.js';

const RATE_LIMIT = { max: 10, windowMs: 10 * 60 * 1000 };

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`final-submit:${clientIp}`, RATE_LIMIT.max, RATE_LIMIT.windowMs);
  if (rate.limited) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many submission attempts. Please try again later.' });
  }

  const {
    registrationId,
    participantEmail,
    isOverwrite,
    otp,
    otpToken,
    problem,
    solution,
    ai_usage,
    technical_brief,
    impact,
    roadmap,
    demo_video,
    source_repo,
    hosted_prototype,
    ai_usage_statement,
    whatsapp_number
  } = req.body || {};

  if (!registrationId || !participantEmail) {
    return res.status(400).json({ error: 'Missing registration details. Please verify your email again.' });
  }

  // Every submission (new or overwrite) must carry a valid, unexpired OTP
  // proving the caller actually completed email verification. This used to
  // only be checked on overwrite, which let anyone who knew a team's
  // registrationId POST a first-time submission for that team with no
  // verification at all.
  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
    return res.status(400).json({ error: 'Please verify your email again before submitting.', otpError: true });
  }
  if (!otpToken || typeof otpToken !== 'string') {
    return res.status(400).json({ error: 'Please verify your email again before submitting.', otpError: true });
  }

  const otpCheck = verifyOtpToken(otpToken, participantEmail.toLowerCase(), otp.trim());
  if (!otpCheck.valid) {
    return res.status(400).json({ error: otpCheck.error || 'Invalid or expired verification code.', otpError: true });
  }

  // Basic validation for required fields (demo_video is optional; all other fields are compulsory)
  const requiredFields = {
    problem,
    solution,
    ai_usage,
    technical_brief,
    impact,
    roadmap,
    source_repo,
    hosted_prototype,
    ai_usage_statement,
    whatsapp_number
  };
  for (const [key, value] of Object.entries(requiredFields)) {
    if (!value || typeof value !== 'string' || !value.trim()) {
      return res.status(400).json({ error: `Field ${key} is required.` });
    }
  }

  if (!isSupabaseConfigured) {
    return res.status(503).json({ error: 'Database service is not available.' });
  }

  try {
    // Confirm the verified email actually belongs to the team behind
    // registrationId - otherwise a valid OTP for YOUR OWN email plus a
    // guessed/leaked registrationId for someone else's team would be enough
    // to write into their submission slot.
    const { data: regRow, error: regLookupError } = await supabaseAdmin
      .from('registrations')
      .select('id, student_email, members')
      .eq('id', registrationId)
      .maybeSingle();

    if (regLookupError) {
      console.error('[api/project-submissions/submit] registration lookup error:', regLookupError.message);
      return res.status(500).json({ error: 'Could not verify registration. Please try again.' });
    }

    const emailLower = participantEmail.trim().toLowerCase();
    const regMembers = Array.isArray(regRow?.members) ? regRow.members : [];
    const belongsToTeam =
      !!regRow &&
      (String(regRow.student_email || '').trim().toLowerCase() === emailLower ||
        regMembers.some((m) => String(m?.email || '').trim().toLowerCase() === emailLower));

    if (!belongsToTeam) {
      return res.status(403).json({ error: 'This email is not associated with the given team registration.' });
    }

    const payload = {
      registration_id: registrationId,
      participant_email: participantEmail,
      problem: problem.trim(),
      solution: solution.trim(),
      ai_usage: ai_usage.trim(),
      technical_brief: technical_brief.trim(),
      impact: impact.trim(),
      roadmap: roadmap.trim(),
      demo_video: demo_video && typeof demo_video === 'string' ? demo_video.trim() : '',
      source_repo: source_repo.trim(),
      hosted_prototype: hosted_prototype.trim(),
      ai_usage_statement: ai_usage_statement.trim(),
      whatsapp_number: whatsapp_number.trim(),
      updated_at: new Date().toISOString()
    };

    let result;
    if (isOverwrite) {
      result = await supabaseAdmin
        .from('project_submissions')
        .update(payload)
        .eq('registration_id', registrationId);
    } else {
      // For a new submission, we can safely insert
      // We don't include updated_at if we want the default, but it's fine.
      result = await supabaseAdmin
        .from('project_submissions')
        .insert([{ ...payload, created_at: new Date().toISOString() }]);
    }

    if (result.error) {
      console.error('[api/project-submissions/submit] DB error:', result.error.message);
      // If it violates unique constraint because they tried to insert twice without overwrite flag
      if (result.error.code === '23505') {
        return res.status(409).json({ error: 'A submission already exists for your team. Please reload and choose to overwrite.' });
      }
      return res.status(500).json({ error: 'Could not save your submission. Please try again.' });
    }

    return res.status(200).json({ success: true, message: 'Submission saved successfully!' });
  } catch (error) {
    console.error('[api/project-submissions/submit] unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
