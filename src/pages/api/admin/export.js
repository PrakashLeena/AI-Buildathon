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

const FINAL_PROJECT_COLUMNS = [
  { label: 'Team Name', value: (s) => s.team_name },
  { label: 'Participant Email', value: (s) => s.participant_email },
  { label: 'Demo Video URL', value: (s) => s.demo_video },
  { label: 'Source Repository URL', value: (s) => s.source_repo },
  { label: 'Hosted Prototype URL', value: (s) => s.hosted_prototype },
  { label: 'Problem', value: (s) => s.problem },
  { label: 'Solution', value: (s) => s.solution },
  { label: 'AI Usage', value: (s) => s.ai_usage },
  { label: 'Technical Brief', value: (s) => s.technical_brief },
  { label: 'Impact', value: (s) => s.impact },
  { label: 'Roadmap', value: (s) => s.roadmap },
  { label: 'AI Usage Statement (Qoder)', value: (s) => s.ai_usage_statement },
  { label: 'Submitted At (UTC)', value: (s) => s.created_at },
  { label: 'Last Updated At (UTC)', value: (s) => s.updated_at || s.created_at }
];

const SUBMISSION_COLUMNS = [
  { label: 'Team Name', value: (s) => s.team_name },
  { label: 'Participant Email', value: (s) => s.participant_email },
  { label: 'WhatsApp Number', value: (s) => s.whatsapp_number },
  { label: 'Project Brief', value: (s) => s.project_brief },
  { label: 'Submitted At (UTC)', value: (s) => s.created_at },
  { label: 'Last Updated At (UTC)', value: (s) => s.updated_at || s.created_at }
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

  const type = (req.query?.type || '').toLowerCase();
  const format = (req.query?.format || '').toLowerCase();
  const singleId = req.query?.id ? String(req.query.id).trim() : null;
  const dateStr = new Date().toISOString().slice(0, 10);

  // --- FINAL PROJECT SUBMISSIONS EXPORT (New Deliverables) ---
  if (type === 'final' || type === 'final_submissions' || type === 'final-submissions' || type === 'final_projects') {
    let query = supabaseAdmin
      .from('project_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (singleId) {
      query = query.eq('id', singleId);
    }

    const [finalRes, regRes] = await Promise.all([
      query,
      supabaseAdmin.from('registrations').select('id, team_name, full_name, student_email')
    ]);

    if (finalRes.error) {
      console.error('[api/admin/export] final submissions query failed:', finalRes.error.message);
      return res.status(500).json({ error: 'Failed to load final project submissions.' });
    }

    const regMap = new Map((regRes.data || []).map((r) => [r.id, r]));
    const rows = (finalRes.data || []).map((ps) => {
      const reg = regMap.get(ps.registration_id);
      return {
        ...ps,
        team_name: reg?.team_name || 'Team',
        team_lead: reg?.full_name || ''
      };
    });

    // TXT Dossier Format
    if (format === 'txt' || (singleId && format !== 'csv')) {
      if (singleId && rows.length > 0) {
        const item = rows[0];
        const safeTeamName = (item.team_name || 'team').replace(/[^a-zA-Z0-9-_]/g, '_');
        const txtContent = [
          '================================================================================',
          `AI BUILDATHON — FINAL PROJECT DOSSIER: ${item.team_name || 'N/A'}`,
          '================================================================================',
          `Submission ID        : ${item.id}`,
          `Team Name            : ${item.team_name}`,
          `Participant Email    : ${item.participant_email}`,
          `Demo Video URL       : ${item.demo_video}`,
          `Source Repository URL: ${item.source_repo}`,
          `Hosted Prototype URL : ${item.hosted_prototype}`,
          `Submitted At (UTC)   : ${item.created_at}`,
          `Last Updated (UTC)   : ${item.updated_at || item.created_at}`,
          '',
          '--------------------------------------------------------------------------------',
          '1. PROBLEM STATEMENT:',
          '--------------------------------------------------------------------------------',
          item.problem || '(None)',
          '',
          '--------------------------------------------------------------------------------',
          '2. WORKING SOLUTION:',
          '--------------------------------------------------------------------------------',
          item.solution || '(None)',
          '',
          '--------------------------------------------------------------------------------',
          '3. GENERAL AI USAGE:',
          '--------------------------------------------------------------------------------',
          item.ai_usage || '(None)',
          '',
          '--------------------------------------------------------------------------------',
          '4. TECHNICAL ARCHITECTURE & FRAMEWORKS:',
          '--------------------------------------------------------------------------------',
          item.technical_brief || '(None)',
          '',
          '--------------------------------------------------------------------------------',
          '5. MEASURABLE IMPACT:',
          '--------------------------------------------------------------------------------',
          item.impact || '(None)',
          '',
          '--------------------------------------------------------------------------------',
          '6. FUTURE ROADMAP & MILESTONES:',
          '--------------------------------------------------------------------------------',
          item.roadmap || '(None)',
          '',
          '--------------------------------------------------------------------------------',
          '7. QODER AI USAGE STATEMENT:',
          '--------------------------------------------------------------------------------',
          item.ai_usage_statement || '(None)',
          '================================================================================',
          ''
        ].join('\n');

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTeamName}-final-dossier-${dateStr}.txt"`);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send(txtContent);
      }

      // Consolidated all final dossiers TXT report
      const header = [
        '================================================================================',
        'AI BUILDATHON — ALL FINAL PROJECT DELIVERABLES REPORT',
        `Generated At        : ${new Date().toUTCString()}`,
        `Total Submissions   : ${rows.length}`,
        '================================================================================',
        '',
        ''
      ].join('\n');

      const itemsTxt = rows.map((item, index) => {
        return [
          `--------------------------------------------------------------------------------`,
          `[#${index + 1}] TEAM: ${item.team_name || 'N/A'}`,
          `--------------------------------------------------------------------------------`,
          `Participant Email    : ${item.participant_email}`,
          `Demo Video URL       : ${item.demo_video}`,
          `Source Repository URL: ${item.source_repo}`,
          `Hosted Prototype URL : ${item.hosted_prototype}`,
          `Submitted At (UTC)   : ${item.created_at}`,
          `Last Updated (UTC)   : ${item.updated_at || item.created_at}`,
          '',
          'PROBLEM:',
          item.problem || '(None)',
          '',
          'SOLUTION:',
          item.solution || '(None)',
          '',
          'AI USAGE:',
          item.ai_usage || '(None)',
          '',
          'TECHNICAL BRIEF:',
          item.technical_brief || '(None)',
          '',
          'IMPACT:',
          item.impact || '(None)',
          '',
          'ROADMAP:',
          item.roadmap || '(None)',
          '',
          'QODER AI STATEMENT:',
          item.ai_usage_statement || '(None)',
          ''
        ].join('\n');
      }).join('\n\n');

      const footer = [
        '================================================================================',
        'END OF REPORT',
        '================================================================================',
        ''
      ].join('\n');

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="all-final-project-dossiers-${dateStr}.txt"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(`${header}${itemsTxt}\n\n${footer}`);
    }

    // Default to CSV
    const csv = toCsv(rows, FINAL_PROJECT_COLUMNS);
    const filename = `all-final-project-submissions-${dateStr}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send('\uFEFF' + csv);
  }

  // --- LEGACY SUBMISSIONS EXPORT (Project Briefs) ---
  if (type === 'submissions' || type === 'submissions_txt' || type === 'submissions-txt' || type === 'submission' || type === 'briefs') {
    let query = supabaseAdmin
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (singleId) {
      query = query.eq('id', singleId);
    }

    const { data: subData, error: subError } = await query;

    if (subError) {
      console.error('[api/admin/export] submissions query failed:', subError.message);
      return res.status(500).json({ error: 'Failed to load submissions.' });
    }

    const rows = subData || [];

    // Check if TXT format is requested
    if (format === 'txt' || type === 'submissions_txt' || type === 'submissions-txt' || (singleId && format !== 'csv')) {
      if (singleId && rows.length > 0) {
        const item = rows[0];
        const safeTeamName = (item.team_name || 'team').replace(/[^a-zA-Z0-9-_]/g, '_');
        const txtContent = [
          '================================================================================',
          `AI BUILDATHON — PROJECT SUBMISSION: ${item.team_name || 'N/A'}`,
          '================================================================================',
          `Submission ID     : ${item.id}`,
          `Team Name         : ${item.team_name}`,
          `Participant Email : ${item.participant_email}`,
          `WhatsApp Number   : ${item.whatsapp_number}`,
          `Submitted At (UTC): ${item.created_at}`,
          `Last Updated (UTC): ${item.updated_at || item.created_at}`,
          '--------------------------------------------------------------------------------',
          'PROJECT BRIEF & BACKGROUND:',
          '--------------------------------------------------------------------------------',
          item.project_brief || '(No brief provided)',
          '================================================================================',
          ''
        ].join('\n');

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTeamName}-project-brief-${dateStr}.txt"`);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send(txtContent);
      }

      // Consolidated all submissions TXT report
      const header = [
        '================================================================================',
        'AI BUILDATHON — ALL PROJECT SUBMISSIONS REPORT',
        `Generated At      : ${new Date().toUTCString()}`,
        `Total Submissions : ${rows.length}`,
        '================================================================================',
        '',
        ''
      ].join('\n');

      const itemsTxt = rows.map((item, index) => {
        return [
          `--------------------------------------------------------------------------------`,
          `[#${index + 1}] TEAM: ${item.team_name || 'N/A'}`,
          `--------------------------------------------------------------------------------`,
          `Participant Email : ${item.participant_email}`,
          `WhatsApp Number   : ${item.whatsapp_number}`,
          `Submitted At (UTC): ${item.created_at}`,
          `Last Updated (UTC): ${item.updated_at || item.created_at}`,
          '',
          `PROJECT BRIEF:`,
          item.project_brief || '(No brief provided)',
          ''
        ].join('\n');
      }).join('\n\n');

      const footer = [
        '================================================================================',
        'END OF REPORT',
        '================================================================================',
        ''
      ].join('\n');

      const fullTxt = `${header}${itemsTxt}\n\n${footer}`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="all-project-briefs-${dateStr}.txt"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(fullTxt);
    }

    // Default to CSV for submissions
    const csv = toCsv(rows, SUBMISSION_COLUMNS);
    const filename = `all-project-briefs-${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send('\uFEFF' + csv);
  }

  // --- REGISTRATIONS EXPORT (People or Teams) ---
  const { data, error } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/admin/export] query failed:', error.message);
    return res.status(500).json({ error: 'Failed to load registrations.' });
  }

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
          faculty: m.faculty || '',
          department: m.department || '',
          year_of_study: m.year_of_study || '',
          team_size: r.team_size || 1,
          created_at: r.created_at || ''
        });
      });
    }

    csv = toCsv(peopleRows, PEOPLE_COLUMNS);
    filename = `all-participants-${dateStr}.csv`;
  } else {
    // Default: Teams export
    csv = toCsv(data || [], TEAM_COLUMNS);
    filename = `all-teams-${dateStr}.csv`;
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send('\uFEFF' + csv);
}
