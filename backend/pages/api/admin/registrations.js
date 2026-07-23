import { getAdminFromRequest } from '../../../lib/adminAuth.js';
import { isSupabaseConfigured, supabaseAdmin, supabaseConfigError } from '../../../lib/supabaseAdmin.js';

// JSON listing of all registrations, used by the dashboard's "Refresh"
// button. The initial page load instead uses getServerSideProps (see
// pages/admin/index.jsx) so the very first render is already protected and
// populated server-side with no loading flash.
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
    console.error(`[api/admin/registrations] ${supabaseConfigError}`);
    return res.status(503).json({ error: 'Database is not configured.' });
  }

  const { data, error } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/admin/registrations] query failed:', error.message);
    return res.status(500).json({ error: 'Failed to load registrations.' });
  }

  return res.status(200).json({ registrations: data });
}
