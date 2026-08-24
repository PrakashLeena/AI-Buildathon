import { getAdminFromRequest } from '../../../lib/adminAuth.js';
import { isSupabaseConfigured, supabaseAdmin, supabaseConfigError } from '../../../lib/supabaseAdmin.js';

// JSON listing of all project submissions, used by the admin dashboard's
// "Refresh" button on the Project Submissions tab.
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

  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/admin/submissions] query failed:', error.message);
    return res.status(500).json({ error: 'Failed to load project submissions.' });
  }

  return res.status(200).json({ submissions: data || [] });
}
