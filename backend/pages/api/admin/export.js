import { getAdminFromRequest } from '../../../lib/adminAuth.js';
import { toCsv } from '../../../lib/csv.js';
import { isSupabaseConfigured, supabaseAdmin, supabaseConfigError } from '../../../lib/supabaseAdmin.js';

const COLUMNS = [
  { label: 'Team Name', value: (r) => r.team_name },
  { label: 'Team Size', value: (r) => r.team_size },
  { label: 'Lead Full Name', value: (r) => r.full_name },
  { label: 'Lead Email', value: (r) => r.student_email },
  { label: 'Lead Student ID', value: (r) => r.student_id },
  { label: 'Faculty', value: (r) => r.faculty },
  { label: 'Department', value: (r) => r.department },
  { label: 'Year of Study', value: (r) => r.year_of_study },
  { label: 'Member 2 Name', value: (r) => r.members?.[0]?.name || '' },
  { label: 'Member 2 Student ID', value: (r) => r.members?.[0]?.student_id || '' },
  { label: 'Member 3 Name', value: (r) => r.members?.[1]?.name || '' },
  { label: 'Member 3 Student ID', value: (r) => r.members?.[1]?.student_id || '' },
  { label: 'Registered At (UTC)', value: (r) => r.created_at }
];

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
    console.error(`[api/admin/export] ${supabaseConfigError}`);
    return res.status(503).json({ error: 'Database is not configured.' });
  }

  const { data, error } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/admin/export] query failed:', error.message);
    return res.status(500).json({ error: 'Failed to load registrations.' });
  }

  const csv = toCsv(data, COLUMNS);
  const filename = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  // Leading UTF-8 BOM so Excel reliably detects encoding for non-ASCII names.
  return res.status(200).send('\uFEFF' + csv);
}
