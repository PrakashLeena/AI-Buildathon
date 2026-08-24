import { applyCors } from '../../../lib/cors.js';
import { verifyOtpToken } from '../../../lib/otpToken.js';
import { checkRateLimit } from '../../../lib/rateLimit.js';
import { getClientIp } from '../../../lib/requestIp.js';
import { isSupabaseConfigured, supabaseAdmin } from '../../../lib/supabaseAdmin.js';

const GMAIL_RE = /^[^\s@]+@gmail\.com$/i;
const PHONE_RE = /^(\+?[0-9]{1,4}[\s-]?)?([0-9\s-]{7,15})$/;

const RATE_LIMIT = { max: 10, windowMs: 10 * 60 * 1000 };

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, route: 'submissions' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const clientIp = getClientIp(req);
  const rate = checkRateLimit(`submissions:${clientIp}`, RATE_LIMIT.max, RATE_LIMIT.windowMs);
  if (rate.limited) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many submission attempts. Please try again later.' });
  }

  const {
    participant_email,
    team_name,
    whatsapp_number,
    project_brief,
    otp,
    otpToken,
    company_website: honeypot
  } = req.body || {};

  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    console.warn(`[api/submissions] honeypot triggered from ${clientIp}`);
    return res.status(400).json({ error: 'Invalid submission.' });
  }

  // 1. Participant Details validation
  const cleanEmail = typeof participant_email === 'string' ? participant_email.trim().toLowerCase() : '';
  if (!cleanEmail) {
    return res.status(400).json({ error: 'Participant email address is required.' });
  }
  if (!GMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid Gmail address (e.g. participant@gmail.com).' });
  }

  let cleanTeam = typeof team_name === 'string' ? team_name.trim() : '';
  if (isSupabaseConfigured) {
    let matchedRegistration = false;
    try {
      const { data: rows } = await supabaseAdmin
        .from('registrations')
        .select('team_name, student_email, members');
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (String(row.student_email || '').trim().toLowerCase() === cleanEmail) {
            cleanTeam = row.team_name;
            matchedRegistration = true;
            break;
          }
          const members = Array.isArray(row.members) ? row.members : [];
          if (members.some((m) => String(m?.email || '').trim().toLowerCase() === cleanEmail)) {
            cleanTeam = row.team_name;
            matchedRegistration = true;
            break;
          }
        }
      }
    } catch (lookupErr) {
      console.warn('[api/submissions] team lookup:', lookupErr.message);
    }

    if (!matchedRegistration) {
      return res.status(403).json({
        error: 'This email is not associated with any registered team. Registration has ended, and submissions are strictly limited to registered teams.'
      });
    }
  }

  if (!cleanTeam) {
    return res.status(400).json({ error: 'No registered team found for this participant.' });
  }

  const cleanPhone = typeof whatsapp_number === 'string' ? whatsapp_number.trim() : '';
  if (!cleanPhone) {
    return res.status(400).json({ error: 'WhatsApp number is required.' });
  }
  const digitsOnly = cleanPhone.replace(/\D/g, '');
  if (!PHONE_RE.test(cleanPhone) || digitsOnly.length < 8 || digitsOnly.length > 15) {
    return res.status(400).json({ error: 'Please enter a valid WhatsApp number (e.g. +94 77 123 4567).' });
  }

  // 2. Email OTP Verification validation
  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
    return res.status(400).json({ error: 'Please enter the 6-digit OTP received by email.' });
  }
  if (!otpToken || typeof otpToken !== 'string') {
    return res.status(400).json({ error: 'Please request an email verification code first.' });
  }

  const otpCheck = verifyOtpToken(otpToken, cleanEmail, otp.trim());
  if (!otpCheck.valid) {
    return res.status(400).json({ error: otpCheck.error || 'Invalid or expired OTP code.' });
  }

  // 3. Project Brief & Background validation
  const cleanBrief = typeof project_brief === 'string' ? project_brief.trim() : '';
  if (!cleanBrief) {
    return res.status(400).json({
      error: 'Project brief and background is required.'
    });
  }
  if (cleanBrief.length < 20) {
    return res.status(400).json({
      error: 'Please provide a brief overview of your project (minimum 20 characters).'
    });
  }
  if (cleanBrief.length > 1000) {
    return res.status(400).json({
      error: 'Project brief exceeds the maximum length of 1,000 characters.'
    });
  }

  // Save or Overwrite in database if Supabase is configured
  let savedId = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  let isOverwritten = false;
  
  if (isSupabaseConfigured) {
    try {
      // Check if team already submitted a brief
      const { data: existing, error: findError } = await supabaseAdmin
        .from('submissions')
        .select('id, team_name')
        .ilike('team_name', cleanTeam)
        .maybeSingle();

      if (findError) {
        console.warn('[api/submissions] lookup warning:', findError.message);
      }

      if (existing?.id) {
        // OVERWRITE existing submission
        isOverwritten = true;
        savedId = existing.id;

        const { error: updateError } = await supabaseAdmin
          .from('submissions')
          .update({
            participant_email: cleanEmail,
            team_name: cleanTeam,
            whatsapp_number: cleanPhone,
            project_brief: cleanBrief,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.warn('[api/submissions] Database update warning:', updateError.message);
        }
      } else {
        // INSERT new submission
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('submissions')
          .insert({
            participant_email: cleanEmail,
            team_name: cleanTeam,
            whatsapp_number: cleanPhone,
            project_brief: cleanBrief,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (!insertError && inserted?.id) {
          savedId = inserted.id;
        } else if (insertError) {
          console.warn('[api/submissions] Database insert warning:', insertError.message);
        }
      }
    } catch (dbErr) {
      console.warn('[api/submissions] DB operation non-fatal error:', dbErr.message);
    }
  }

  const successMessage = isOverwritten
    ? `Your previous submission for team "${cleanTeam}" has been overwritten and updated successfully!`
    : 'Project brief submitted successfully!';

  return res.status(200).json({
    success: true,
    isOverwritten,
    message: successMessage,
    submission: {
      id: savedId,
      participantEmail: cleanEmail,
      teamName: cleanTeam,
      whatsappNumber: cleanPhone,
      isOverwritten,
      submittedAt: new Date().toISOString()
    }
  });
}

