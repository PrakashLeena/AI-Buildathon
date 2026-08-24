import { applyCors } from '../../lib/cors.js';
import { isSupabaseConfigured, supabaseAdmin } from '../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!isSupabaseConfigured) {
    return res.status(200).json({ teams: [] });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('registrations')
      .select('team_name')
      .order('team_name', { ascending: true });

    if (error) {
      console.warn('[api/teams] lookup failed:', error.message);
      return res.status(200).json({ teams: [] });
    }

    const uniqueTeams = Array.from(
      new Set(
        (data || [])
          .map((r) => r.team_name?.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return res.status(200).json({ teams: uniqueTeams });
  } catch (err) {
    console.warn('[api/teams] error:', err.message);
    return res.status(200).json({ teams: [] });
  }
}
