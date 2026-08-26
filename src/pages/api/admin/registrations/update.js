import { getAdminFromRequest } from '../../../../lib/adminAuth.js';
import { findAlreadyRegistered } from '../../../../lib/participantLookup.js';
import { isSupabaseConfigured, supabaseAdmin, supabaseConfigError } from '../../../../lib/supabaseAdmin.js';
import { validateRegistration } from '../../../../lib/validateRegistration.js';

// Lets an authenticated admin edit any registration in full, including the
// team name - unlike the self-service leader flow (registrations/update.js)
// which only lets a team edit its own members and keeps the name locked.
// Needed because nothing ever enforced unique team names, so admins are the
// ones who have to resolve a name collision by renaming one of the teams.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  if (!isSupabaseConfigured) {
    console.error(`[api/admin/registrations/update] ${supabaseConfigError}`);
    return res.status(503).json({ error: 'Database is not configured.' });
  }

  const { id } = req.body || {};
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Registration id is required.' });
  }

  const { data: existing, error: findError } = await supabaseAdmin
    .from('registrations')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (findError) {
    console.error('[api/admin/registrations/update] lookup failed:', findError.message);
    return res.status(500).json({ error: 'Could not load the registration to update.' });
  }
  if (!existing) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  const {
    team_name,
    full_name,
    student_email,
    student_id,
    faculty,
    department,
    year_of_study,
    team_size,
    members
  } = req.body || {};

  const { valid, data, error: validationError } = validateRegistration({
    full_name,
    email: student_email,
    student_id,
    faculty,
    department,
    year_of_study,
    team_name,
    team_size,
    members,
    tools_interested: []
  });
  if (!valid) {
    return res.status(400).json({ error: validationError });
  }

  // Team names must stay unique (case-insensitive) - this is the exact
  // loophole that let two teams collide and overwrite each other's project
  // brief submission.
  const { data: nameClash, error: nameClashError } = await supabaseAdmin
    .from('registrations')
    .select('id')
    .ilike('team_name', data.team_name)
    .neq('id', id)
    .maybeSingle();
  if (nameClashError) {
    console.error('[api/admin/registrations/update] name-clash lookup failed:', nameClashError.message);
    return res.status(500).json({ error: 'Could not verify team name availability.' });
  }
  if (nameClash) {
    return res.status(409).json({ error: `Team name "${data.team_name}" is already used by another team.` });
  }

  try {
    const conflict = await findAlreadyRegistered(
      [
        { email: data.email, studentId: data.student_id, label: data.full_name },
        ...data.members.map((m) => ({ email: m.email, studentId: m.student_id, label: m.name }))
      ],
      { excludeRegistrationId: id }
    );
    if (conflict) {
      return res.status(409).json({
        error: `${conflict.label} is already registered with team "${conflict.teamName}" (matched by ${conflict.matchedBy}). Each person can only be part of one team.`
      });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({
        team_name: data.team_name,
        full_name: data.full_name,
        student_email: data.email,
        student_id: data.student_id,
        faculty: data.faculty,
        department: data.department,
        year_of_study: data.year_of_study,
        team_size: data.team_size,
        members: data.members
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('[api/admin/registrations/update] update failed:', updateError.message);
      return res.status(500).json({ error: 'Could not save changes.' });
    }

    // Keep the team's existing submission (if any) showing the same name -
    // submissions are now linked by registration_id, so this is purely
    // cosmetic sync, not an identity fix.
    const { error: syncError } = await supabaseAdmin
      .from('submissions')
      .update({ team_name: data.team_name })
      .eq('registration_id', id);
    if (syncError) {
      console.warn('[api/admin/registrations/update] submission team_name sync warning:', syncError.message);
    }

    return res.status(200).json({ registration: updated });
  } catch (err) {
    console.error('[api/admin/registrations/update] unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred while saving changes.' });
  }
}
