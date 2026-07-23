import { createClient } from '@supabase/supabase-js';

// Accept a couple of common alternate names for the (non-secret) project URL,
// in case it was set up copying a frontend-style env var by mistake. The URL
// alone isn't sensitive, so this fallback is safe.
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Common mistake: pasting the publishable/anon key (new format
// "sb_publishable_...", legacy JWT with "role":"anon") where the secret/
// service_role key is required. That key can't create Auth users or bypass
// RLS, so we want a clear, specific error instead of a generic "not
// configured" message if someone wires this up wrong.
const looksLikePublishableKey =
  typeof SUPABASE_SERVICE_ROLE_KEY === 'string' && SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_publishable_');
const misconfiguredWithPublishableKey =
  looksLikePublishableKey ||
  (!SUPABASE_SERVICE_ROLE_KEY &&
    typeof (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY) === 'string' &&
    Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY));

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !looksLikePublishableKey);

export const supabaseConfigError = looksLikePublishableKey
  ? 'SUPABASE_SERVICE_ROLE_KEY is set to a publishable/anon key (starts with "sb_publishable_"). ' +
    'This backend needs the SECRET/service_role key instead (Supabase Dashboard -> Project Settings -> API -> service_role).'
  : misconfiguredWithPublishableKey
    ? 'Found a publishable/anon key (SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY) but no SUPABASE_SERVICE_ROLE_KEY. ' +
      'Set SUPABASE_SERVICE_ROLE_KEY to the SECRET key from Supabase Dashboard -> Project Settings -> API -> service_role.'
    : 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.';

if (!isSupabaseConfigured) {
  console.warn(`[supabaseAdmin] ${supabaseConfigError} API routes that touch the database will return 503.`);
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
