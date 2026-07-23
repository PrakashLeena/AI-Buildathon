import { applyCors } from '../../lib/cors.js';
import { isSupabaseConfigured } from '../../lib/supabaseAdmin.js';

export default function handler(req, res) {
  if (applyCors(req, res)) return;
  // supabaseConfigured is safe to expose: it's a boolean, never the actual
  // credentials. Handy for quickly confirming env vars are wired correctly
  // after a deploy without digging through server logs.
  res.status(200).json({
    status: 'ok',
    service: 'ai-buildathon-backend',
    supabaseConfigured: isSupabaseConfigured,
    time: new Date().toISOString()
  });
}
