import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabaseAdmin] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. ' +
      'API routes that touch the database will return 503 until backend/.env.local is configured.'
  );
}

// Server-only Supabase client using the SERVICE ROLE key. This key must
// NEVER be exposed to the browser - it bypasses Row Level Security, which is
// exactly why all database/auth access now happens here in the backend
// instead of directly from the frontend.
//
// A placeholder URL is used when unconfigured so `createClient` doesn't
// throw at module-import time (which would crash every route, even ones
// that should return a clean validation error before ever touching
// Supabase). Route handlers should check `isSupabaseConfigured` first.
export const supabaseAdmin = createClient(
  SUPABASE_URL || 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
