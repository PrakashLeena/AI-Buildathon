import { applyCors } from '../../../lib/cors.js';
import { verifyOtpToken } from '../../../lib/otpToken.js';
import { checkRateLimit } from '../../../lib/rateLimit.js';
import { getClientIp } from '../../../lib/requestIp.js';
import { isSupabaseConfigured, supabaseAdmin } from '../../../lib/supabaseAdmin.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT = { max: 15, windowMs: 10 * 60 * 1000 };

const norm = (v) => String(v || '').trim().toLowerCase();

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`submission-verify:${clientIp}`, RATE_LIMIT.max, RATE_LIMIT.windowMs);
  if (rate.limited) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many verification attempts. Please try again later.' });
  }

  const { email, otp, otpToken } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!cleanEmail || !EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
    return res.status(400).json({ error: 'Please enter the 6-digit OTP code.' });
  }

  if (!otpToken || typeof otpToken !== 'string') {
    return res.status(400).json({ error: 'Please request an OTP first.' });
  }

  const otpResult = verifyOtpToken(otpToken, cleanEmail, otp.trim());
  if (!otpResult.valid) {
    return res.status(400).json({ error: otpResult.error || 'Invalid or expired OTP code.' });
  }

  // Auto-detect Team from Supabase registrations
  let detectedTeam = null;
  let existingBrief = null;

  if (isSupabaseConfigured) {
    try {
      const { data: rows, error } = await supabaseAdmin
        .from('registrations')
        .select('id, team_name, full_name, student_email, faculty, department, year_of_study, members');

      if (!error && Array.isArray(rows)) {
        for (const row of rows) {
          // Check if user is lead
          if (norm(row.student_email) === cleanEmail) {
            detectedTeam = {
              teamName: row.team_name,
              leadName: row.full_name,
              leadEmail: row.student_email,
              faculty: row.faculty,
              department: row.department,
              yearOfStudy: row.year_of_study,
              role: 'Team Leader'
            };
            break;
          }
          // Check members
          const members = Array.isArray(row.members) ? row.members : [];
          const matchedMember = members.find((m) => norm(m?.email) === cleanEmail);
          if (matchedMember) {
            detectedTeam = {
              teamName: row.team_name,
              leadName: row.full_name,
              leadEmail: row.student_email,
              faculty: matchedMember.faculty || row.faculty,
              department: matchedMember.department || row.department,
              yearOfStudy: matchedMember.year_of_study || row.year_of_study,
              role: 'Team Member',
              memberName: matchedMember.name
            };
            break;
          }
        }
      }

      // If team found, check if a brief was already submitted for this team
      if (detectedTeam?.teamName) {
        const { data: subRow } = await supabaseAdmin
          .from('submissions')
          .select('project_brief, updated_at')
          .ilike('team_name', detectedTeam.teamName)
          .maybeSingle();

        if (subRow?.project_brief) {
          existingBrief = subRow.project_brief;
        }
      }
    } catch (err) {
      console.warn('[api/submissions/verify] lookup failed:', err.message);
    }
  }

  if (!detectedTeam) {
    return res.status(403).json({
      error: 'No registered team was found for this email address. The registration period has ended, and submissions are strictly limited to registered teams.'
    });
  }

  return res.status(200).json({
    valid: true,
    message: 'OTP verified successfully!',
    team: detectedTeam,
    existingBrief
  });
}

