// Central API client. Every write/read the frontend needs goes through the
// Next.js backend - the frontend never imports Supabase or holds any DB
// credentials. In dev, Vite proxies `/api/*` to the backend (see
// vite.config.js); in production set VITE_API_BASE_URL to the deployed
// backend origin (e.g. https://api.yourdomain.com/api).
// Strip any trailing slash so `${API_BASE_URL}${path}` never produces a
// double slash (e.g. ".../api//registrations"), which Vercel/most hosts
// will redirect - and browsers refuse to follow a redirect on a CORS
// preflight (OPTIONS) request, causing a confusing CORS error instead of
// the real cause.
function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // In the browser, Next.js serves both the frontend and /api routes on the SAME origin.
  // Using relative '/api' avoids DNS resolution failures (ERR_NAME_NOT_RESOLVED).
  if (typeof window !== 'undefined') {
    const customBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (customBase && !customBase.includes('yourdomain.com') && !customBase.includes('example.com')) {
      if (customBase.startsWith('http://') || customBase.startsWith('https://')) {
        return `${customBase.replace(/\/+$/, '')}${cleanPath}`;
      }
    }
    return `/api${cleanPath.replace(/^\/api/, '')}`;
  }

  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');
  return `${base}${cleanPath}`;
}

async function request(path, options = {}) {
  const url = getApiUrl(path);
  let res;

  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch (networkErr) {
    // If an external base URL failed DNS resolution, fallback immediately to local relative '/api'
    if (typeof window !== 'undefined' && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        const fallbackUrl = `/api${path.startsWith('/') ? path : `/${path}`}`.replace(/^\/api\/api/, '/api');
        res = await fetch(fallbackUrl, {
          headers: { 'Content-Type': 'application/json' },
          ...options
        });
      } catch (fallbackErr) {
        throw new Error(`Network error: ${networkErr.message || 'Unable to reach server'}`);
      }
    } else {
      throw new Error(`Network error: ${networkErr.message || 'Unable to reach server'}`);
    }
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

/**
 * Submit a new team registration. All validation, Supabase Auth sign-up and
 * the `registrations` table insert happen server-side in the backend.
 * The payload must include `otp` + `otpToken` from a completed email
 * verification (see sendVerificationOtp).
 */
export function registerTeam(payload) {
  return request('/registrations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Email the team leader a 6-digit verification code. Returns { otpToken,
 * expiresInMinutes }; the token must be sent back with the code when
 * registering. Pass the previous `otpToken` as `previousToken` to resend
 * without a fresh CAPTCHA. Pass `mode: 'edit'` when an existing leader is
 * verifying to edit their team (their email must already be registered).
 */
export function sendVerificationOtp(payload) {
  return request('/otp/send', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Fetch the caller's saved registration (leader only, proven via OTP).
 * Payload: { email, otp, otpToken }.
 */
export function fetchTeamForEdit(payload) {
  return request('/registrations/details', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Replace the team's member list (leader only, proven via OTP).
 * Payload: { email, otp, otpToken, members }.
 */
export function updateTeamMembers(payload) {
  return request('/registrations/update', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Fetch unique list of registered teams.
 */
export function getRegisteredTeams() {
  return request('/teams', {
    method: 'GET'
  });
}

/**
 * Admin-only: edit any registration in full, including the team name.
 * Payload: { id, full_name, student_email, student_id, faculty, department,
 * year_of_study, team_name, team_size, members }.
 */
export function adminUpdateRegistration(payload) {
  return request('/admin/registrations/update', {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify(payload)
  });
}

/**
 * Verify OTP and auto-detect team details for submission.
 * Payload: { email, otp, otpToken }.
 */
export function verifySubmissionOtp(payload) {
  return request('/submissions/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Submit Project Brief and Overview.
 * Payload: { participant_email, team_name, whatsapp_number, otp, otpToken, project_brief }.
 */
export function submitProjectBrief(payload) {
  return request('/submissions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}


