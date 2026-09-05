import { getAdminFromRequest } from '../../../lib/adminAuth.js';
import { isSupabaseConfigured, supabaseAdmin, supabaseConfigError } from '../../../lib/supabaseAdmin.js';

// JSON listing of all project submissions (both new final deliverables and initial briefs)
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  if (!isSupabaseConfigured) {
    console.error(`[api/admin/submissions] ${supabaseConfigError}`);
    return res.status(503).json({ error: 'Database is not configured.' });
  }

  try {
    const [finalRes, regRes, briefRes] = await Promise.all([
      supabaseAdmin.from('project_submissions').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('registrations').select('id, team_name, full_name, student_email, student_id, team_size'),
      supabaseAdmin.from('submissions').select('*').order('created_at', { ascending: false })
    ]);

    if (finalRes.error) {
      console.error('[api/admin/submissions] final submissions query failed:', finalRes.error.message);
    }
    if (briefRes.error) {
      console.error('[api/admin/submissions] brief submissions query failed:', briefRes.error.message);
    }

    const regMap = new Map((regRes.data || []).map((r) => [r.id, r]));

    const projectSubmissions = (finalRes.data || []).map((ps) => {
      const reg = regMap.get(ps.registration_id);
      return {
        ...ps,
        team_name: reg?.team_name || 'Team',
        team_lead: reg?.full_name || '',
        student_id: reg?.student_id || '',
        team_size: reg?.team_size || 1
      };
    });

    const briefSubmissions = briefRes.data || [];

    return res.status(200).json({
      projectSubmissions,
      briefSubmissions,
      // Default submissions alias points to final project submissions
      submissions: projectSubmissions
    });
  } catch (err) {
    console.error('[api/admin/submissions] unexpected error:', err);
    return res.status(500).json({ error: 'Failed to load project submissions.' });
  }
}
