import crypto from 'crypto';
import { applyCors } from '../../../lib/cors.js';
import { isSupabaseConfigured, supabaseAdmin, supabaseConfigError } from '../../../lib/supabaseAdmin.js';
import { validateRegistration } from '../../../lib/validateRegistration.js';

// Generates a random password for the Supabase Auth user created on behalf
// of the registrant. Nobody needs to know/use this password today - it just
// satisfies Supabase Auth's requirement for a credential on the account -
// but it is generated securely server-side instead of in the browser.
function generateSecurePassword() {
  return crypto.randomBytes(24).toString('base64url');
}

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

  const { valid, data, error: validationError } = validateRegistration(req.body);
  if (!valid) {
    return res.status(400).json({ error: validationError });
  }

  if (!isSupabaseConfigured) {
    // Full detail goes to server logs only - never leak env var names/state to the client.
    console.error(`[api/registrations] Supabase is not configured: ${supabaseConfigError}`);
    return res.status(503).json({
      error: 'Registration service is not configured yet. Please try again later.'
    });
  }

  try {
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
