import { getAdminFromRequest } from '../../../lib/adminAuth.js';
import { toCsv } from '../../../lib/csv.js';
import { isSupabaseConfigured, supabaseAdmin, supabaseConfigError } from '../../../lib/supabaseAdmin.js';

const TEAM_COLUMNS = [
  { label: 'Team Name', value: (r) => r.team_name },
  { label: 'Team Size', value: (r) => r.team_size },
  { label: 'Lead Full Name', value: (r) => r.full_name },
  { label: 'Lead Email', value: (r) => r.student_email },
  { label: 'Lead Student ID', value: (r) => r.student_id },
  { label: 'Lead Faculty', value: (r) => r.faculty },
  { label: 'Lead Department', value: (r) => r.department },
  { label: 'Lead Year of Study', value: (r) => r.year_of_study },
  { label: 'Member 2 Name', value: (r) => r.members?.[0]?.name || '' },
  { label: 'Member 2 Email', value: (r) => r.members?.[0]?.email || '' },
  { label: 'Member 2 Student ID', value: (r) => r.members?.[0]?.student_id || '' },
  { label: 'Member 2 Faculty', value: (r) => r.members?.[0]?.faculty || '' },
  { label: 'Member 2 Department', value: (r) => r.members?.[0]?.department || '' },
  { label: 'Member 2 Year of Study', value: (r) => r.members?.[0]?.year_of_study || '' },
  { label: 'Member 3 Name', value: (r) => r.members?.[1]?.name || '' },
  { label: 'Member 3 Email', value: (r) => r.members?.[1]?.email || '' },
  { label: 'Member 3 Student ID', value: (r) => r.members?.[1]?.student_id || '' },
  { label: 'Member 3 Faculty', value: (r) => r.members?.[1]?.faculty || '' },
  { label: 'Member 3 Department', value: (r) => r.members?.[1]?.department || '' },
  { label: 'Member 3 Year of Study', value: (r) => r.members?.[1]?.year_of_study || '' },
  { label: 'Registered At (UTC)', value: (r) => r.created_at }
];

const PEOPLE_COLUMNS = [
  { label: 'Full Name', value: (p) => p.name },
  { label: 'Email', value: (p) => p.email },
  { label: 'Role', value: (p) => p.role },
  { label: 'Team Name', value: (p) => p.team_name },
  { label: 'Student ID', value: (p) => p.student_id },
  { label: 'Faculty', value: (p) => p.faculty },
  { label: 'Department', value: (p) => p.department },
  { label: 'Year of Study', value: (p) => p.year_of_study },
  { label: 'Team Size', value: (p) => p.team_size },
  { label: 'Registered At (UTC)', value: (p) => p.created_at }
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

  const type = (req.query?.type || '').toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);

  let csv = '';
  let filename = '';

  if (type === 'people' || type === 'participants' || type === 'members' || type === 'all') {
    const peopleRows = [];
    for (const r of data || []) {
      // 1. Team Leader
      peopleRows.push({
        name: r.full_name || '',
        email: r.student_email || '',
        role: Number(r.team_size) > 1 ? 'Team Lead' : 'Solo Participant',
        team_name: r.team_name || '',
        student_id: r.student_id || '',
        faculty: r.faculty || '',
        department: r.department || '',
        year_of_study: r.year_of_study || '',
        team_size: r.team_size || 1,
        created_at: r.created_at || ''
      });

      // 2. Team Members
      const members = Array.isArray(r.members) ? r.members : [];
      members.forEach((m, idx) => {
        if (!m) return;
        peopleRows.push({
          name: m.name || '',
          email: m.email || '',
          role: `Member ${idx + 2}`,
          team_name: r.team_name || '',
          student_id: m.student_id || '',
          faculty: m.faculty || r.faculty || '',
          department: m.department || r.department || '',
          year_of_study: m.year_of_study || '',
          team_size: r.team_size || 1,
          created_at: r.created_at || ''
        });
      });
    }

    csv = toCsv(peopleRows, PEOPLE_COLUMNS);
    filename = `all-people-names-emails-${dateStr}.csv`;
  } else {
    csv = toCsv(data || [], TEAM_COLUMNS);
    filename = `team-registrations-${dateStr}.csv`;
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  // Leading UTF-8 BOM so Excel reliably detects encoding for non-ASCII names.
  return res.status(200).send('\uFEFF' + csv);
}
