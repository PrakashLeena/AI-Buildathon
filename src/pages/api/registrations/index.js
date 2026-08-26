import crypto from 'crypto';
import { applyCors } from '../../../lib/cors.js';
import { sendWelcomeEmail } from '../../../lib/email.js';
import { verifyOtpToken } from '../../../lib/otpToken.js';
import { findAlreadyRegistered } from '../../../lib/participantLookup.js';
import { checkRateLimit } from '../../../lib/rateLimit.js';
import { getClientIp } from '../../../lib/requestIp.js';
import { isSupabaseConfigured, supabaseAdmin, supabaseConfigError } from '../../../lib/supabaseAdmin.js';
import { validateRegistration } from '../../../lib/validateRegistration.js';

// Generates a random password for the Supabase Auth user created on behalf
// of the registrant. Nobody needs to know/use this password today - it just
// satisfies Supabase Auth's requirement for a credential on the account -
// but it is generated securely server-side instead of in the browser.
function generateSecurePassword() {
  return crypto.randomBytes(24).toString('base64url');
}

// Registration submissions are rate-limited per IP on top of the CAPTCHA
// requirement - see lib/rateLimit.js for why this is a soft, best-effort
// limit rather than a hard global one.
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 }; // 5 submissions / 10 min / IP

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    // Lightweight existence check so the frontend/ops can sanity-check the route.
    return res.status(200).json({ ok: true, route: 'registrations' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const clientIp = getClientIp(req);

  // Cheapest check first: cap how many submissions a single IP can make in
  // a short window, before spending a call to Cloudflare's siteverify API
  // or touching Supabase at all.
  const rate = checkRateLimit(`registrations:${clientIp}`, RATE_LIMIT.max, RATE_LIMIT.windowMs);
  if (rate.limited) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many registration attempts. Please try again later.' });
  }

  // Honeypot: a hidden form field no real user can see or fill in, but
  // simple bots that blindly fill every input often do. Any non-empty value
  // here means the submission almost certainly isn't from the real form -
  // reject it before spending a CAPTCHA verification call or a DB write.
  const { company_website: honeypot } = req.body || {};
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    console.warn(`[api/registrations] honeypot triggered from ${clientIp}`);
    return res.status(400).json({ error: 'Invalid submission.' });
  }

  const { valid, data, error: validationError } = validateRegistration(req.body);
  if (!valid) {
    return res.status(400).json({ error: validationError });
  }

  // Email verification replaces the CAPTCHA check that used to live here:
  // the CAPTCHA is now verified when the OTP is SENT (see /api/otp/send),
  // and the signed token below can only exist if that step succeeded. The
  // token also proves the team leader controls the inbox they registered.
  const { otp, otpToken } = req.body || {};
  const otpResult = verifyOtpToken(otpToken, data.email, otp);
  if (!otpResult.valid) {
    return res.status(400).json({ error: otpResult.error });
  }

  if (!isSupabaseConfigured) {
    // Full detail goes to server logs only - never leak env var names/state to the client.
    console.error(`[api/registrations] Supabase is not configured: ${supabaseConfigError}`);
    return res.status(503).json({
      error: 'Registration service is not configured yet. Please try again later.'
    });
  }

  try {
    // 0) One person = one team. Block the whole submission if the leader OR
    // any member is already registered anywhere (as a leader or a member),
    // matched by email or student ID. Runs before the Auth user is created
    // so a rejected team leaves nothing behind to clean up.
    const conflict = await findAlreadyRegistered([
      { email: data.email, studentId: data.student_id, label: data.full_name },
      ...data.members.map((m) => ({ email: m.email, studentId: m.student_id, label: m.name }))
    ]);
    if (conflict) {
      return res.status(409).json({
        error: `${conflict.label} is already registered with team "${conflict.teamName}" (matched by ${conflict.matchedBy}). Each person can only be part of one team.`
      });
    }

    // 0b) Team names must be unique (case-insensitive). This used to be
    // unchecked, which let two unrelated teams register under the same
    // name and made later submissions ambiguous (see the submissions table
    // migration in db/schema.sql).
    const { data: nameClash, error: nameClashError } = await supabaseAdmin
      .from('registrations')
      .select('id')
      .ilike('team_name', data.team_name)
      .maybeSingle();
    if (nameClashError) {
      console.error('[api/registrations] name-clash lookup failed:', nameClashError.message);
      return res.status(500).json({ error: 'Could not verify team name availability. Please try again.' });
    }
    if (nameClash) {
      return res.status(409).json({ error: `Team name "${data.team_name}" is already taken. Please choose a different name.` });
    }

    // 1) Create the Supabase Auth user server-side using the service role key.
    const { data: createdUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: generateSecurePassword(),
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        student_id: data.student_id,
        faculty: data.faculty,
        department: data.department,
        year_of_study: data.year_of_study
      }
    });

    if (authError) {
      const status = authError.status === 422 || /already registered/i.test(authError.message) ? 409 : 500;
      return res.status(status).json({ error: authError.message });
    }

    const user = createdUser?.user;
    if (!user) {
      return res.status(500).json({ error: 'Failed to create user account.' });
    }

    // 2) Insert the team registration row, linked to the newly created user.
    const { data: inserted, error: dbError } = await supabaseAdmin
      .from('registrations')
      .insert([
        {
          user_id: user.id,
          full_name: data.full_name,
          student_email: data.email,
          student_id: data.student_id,
          faculty: data.faculty,
          department: data.department,
          year_of_study: data.year_of_study,
          team_name: data.team_name,
          team_size: data.team_size,
          members: data.members,
          tools_interested: data.tools_interested
        }
      ])
      .select()
      .single();

    if (dbError) {
      // Auth user was created but the profile write failed - clean up so a
      // retry with the same email doesn't hit "already registered".
      await supabaseAdmin.auth.admin.deleteUser(user.id).catch(() => {});
      return res.status(500).json({ error: `Registration failed while saving your profile: ${dbError.message}` });
    }

    // 3) Welcome email to the whole team (leader + members). Deliberately
    // non-fatal: the registration is already saved, so an email hiccup must
    // not turn a successful sign-up into an error for the user. Skipped
    // entirely in OTP_TEST_MODE so test registrations send no real mail.
    if (process.env.OTP_TEST_MODE === 'true') {
      console.warn('[api/registrations] OTP_TEST_MODE active - welcome email skipped.');
    } else {
      try {
        const recipients = [data.email, ...data.members.map((m) => m.email)];
        await sendWelcomeEmail({
          to: [...new Set(recipients)],
          fullName: data.full_name,
          teamName: data.team_name,
          teamSize: data.team_size
        });
      } catch (emailErr) {
        console.error('[api/registrations] welcome email failed:', emailErr);
      }
    }

    return res.status(201).json({
      message: 'Team registered successfully.',
      registration: {
        id: inserted.id,
        team_name: inserted.team_name,
        team_size: inserted.team_size
      }
    });
  } catch (err) {
    console.error('[api/registrations] unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred during registration.' });
  }
}
