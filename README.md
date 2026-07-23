# AI Buildathon Website

Two-app architecture:

- **`frontend/`** — React 18 + Vite + Tailwind CSS. Pure UI, no database or
  Supabase code. All data operations go through `fetch` calls to the backend
  API (see `frontend/src/lib/api.js`).
- **`backend/`** — Next.js API-only app. Owns all database/auth access via
  the Supabase **service role** key (never exposed to the browser). Exposes
  JSON routes under `/api/*`.

The visual design is unchanged: the original hand-authored `styles.css` is
imported as-is into the React app, so every section, color, animation and
responsive breakpoint looks identical to the previous static HTML site.
Tailwind CSS is installed and configured (with `preflight` disabled so it
doesn't fight the existing design system) and is available for any new
markup going forward.

## Project layout

```
website/
├── frontend/                # React + Vite + Tailwind app
│   ├── src/
│   │   ├── components/      # Header, Hero, About, Toolkit, Timeline, Prizes, Footer, RegisterModal
│   │   ├── hooks/           # Lenis, reveal-on-scroll, countdown, canvases, timeline scroll, header scroll
│   │   ├── context/         # Register modal open/close context
│   │   ├── data/            # Faculty/department + timeline static data
│   │   ├── lib/api.js       # fetch() wrapper that calls the backend - the ONLY way the UI talks to a server
│   │   ├── styles.css       # Original design system (verbatim)
│   │   └── index.css        # Tailwind directives + import of styles.css
│   └── public/assets/       # Site images (logos, hero banner, etc.)
├── backend/                  # Next.js app: public API + /admin dashboard
│   ├── pages/
│   │   ├── api/
│   │   │   ├── health.js
│   │   │   ├── registrations/index.js   # Creates Supabase Auth user + registrations row
│   │   │   └── admin/                   # session (login), logout, registrations, export - all auth-gated
│   │   └── admin/
│   │       ├── login.jsx     # Google sign-in
│   │       └── index.jsx     # Dashboard: stats, search/sort, export CSV (SSR-protected)
│   ├── lib/supabaseAdmin.js  # Service-role Supabase client (server-only)
│   ├── lib/firebaseAdmin.js  # Firebase Admin SDK (server-only) - verifies Google sign-ins
│   ├── lib/firebaseClient.js # Firebase client config (safe to expose) - used only on /admin/login
│   ├── lib/adminAuth.js      # Session cookie + ADMIN_EMAILS allowlist logic
│   ├── lib/csv.js            # CSV export with formula-injection sanitization
│   ├── lib/validateRegistration.js
│   ├── lib/cors.js
│   └── db/schema.sql         # SQL to (re)create the `registrations` table + RLS
└── package.json               # Convenience scripts to run both apps together
```

## Setup

1. Create a Supabase project (or reuse the existing one) and run
   `backend/db/schema.sql` in the Supabase SQL editor.
2. Copy env files and fill in real values:
   ```bash
   cp backend/.env.example backend/.env.local
   cp frontend/.env.example frontend/.env.local
   ```
   - `backend/.env.local` needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
     (Project Settings → API → `service_role` secret — keep this private).
   - `frontend/.env.local` can be left at its defaults for local dev.
3. Install dependencies:
   ```bash
   npm run install:all
   ```

## Run locally

```bash
npm run dev
```

This starts the backend on `http://localhost:4000` and the frontend on
`http://localhost:5173`. The frontend calls same-origin `/api/*`, which Vite
proxies to the backend, so the browser never talks to Supabase directly.

Or run them individually:

```bash
npm run dev:backend
npm run dev:frontend
```

## Build for production

```bash
npm run build
```

Deploy `backend/` (Next.js) and `frontend/` (static `dist/` output from
Vite) separately (e.g. backend on a Node host/Vercel, frontend on any static
host/CDN). Set `frontend/.env` → `VITE_API_BASE_URL` to the deployed backend
URL, and `backend/.env` → `FRONTEND_ORIGIN` to the deployed frontend URL (for
CORS).

## Data flow

```
Browser (React) --fetch--> Next.js API routes --> Supabase (service role) --> Postgres
```

The frontend never imports `@supabase/supabase-js` and never sees the
service role key or an anon key — registration, validation, Supabase Auth
user creation, and the database insert all happen inside
`backend/pages/api/registrations/index.js`.

### Registration form abuse protection

`POST /api/registrations` layers several defenses, in order (cheapest checks
first):

1. **Per-IP rate limiting** — `backend/lib/rateLimit.js`, a lightweight
   in-memory limiter (5 submissions / 10 min / IP). Best-effort only (state
   isn't shared across serverless instances/regions) — a soft speed bump on
   top of the CAPTCHA below, not a hard global limit.
2. **Honeypot field** — a hidden `company_website` input real users never
   see or fill in; a non-empty value is treated as a bot and rejected.
3. **Cloudflare Turnstile CAPTCHA** — verified server-side in
   `backend/lib/verifyTurnstile.js` before anything touches the database.
   Requires `TURNSTILE_SECRET_KEY` (backend) and `VITE_TURNSTILE_SITE_KEY`
   (frontend) — see the `.env.example` files.
4. **Server-side validation with length caps** —
   `backend/lib/validateRegistration.js` re-validates every field
   independently of the frontend (never trusts `type="email"` or dropdown
   values alone) and caps string lengths to stop oversized payloads.
5. **Duplicate-registration protection** — Supabase Auth rejects a second
   sign-up with the same email (`409 Conflict`), so the same person/email
   can't register multiple teams.

## Admin dashboard (`/admin`)

A same-origin admin panel lives inside the backend app at
`https://<your-backend-domain>/admin` — view all registrations, search/sort,
drill into team members, and export everything to CSV. It is completely
separate from the public frontend and is **not** linked from anywhere in the
public site.

### How auth works

- Sign-in uses **Firebase Authentication with Google** (client-side popup on
  `/admin/login`).
- The resulting Google ID token is sent to `POST /api/admin/session`, which
  verifies it server-side with the **Firebase Admin SDK** and checks the
  signed-in email against the `ADMIN_EMAILS` allowlist env var. Only then is
  a secure, `httpOnly`, `SameSite=Strict` session cookie issued.
- Every admin page (`getServerSideProps`) and every `/api/admin/*` route
  re-verifies that cookie **and** re-checks the allowlist on every request —
  revoking someone's access is just removing their email from `ADMIN_EMAILS`
  and redeploying, no token cleanup needed.
- `/api/admin/*` is deliberately excluded from the public CORS config in
  `next.config.js`, so the frontend's origin (or any other origin) is never
  granted cross-origin access to admin data.

### One-time setup

1. **Firebase project**: you already have one (`ai-buildathon-d4106`). In the
   [Firebase Console](https://console.firebase.google.com/) →
   **Authentication → Sign-in method**, enable the **Google** provider if it
   isn't already.
2. **Client config** (safe to expose, already filled into `backend/.env`):
   `NEXT_PUBLIC_FIREBASE_*` vars, from Project Settings → General → your web app.
3. **Admin SDK service account** (secret, server-only):
   - Firebase Console → Project Settings → **Service Accounts** → **Generate
     new private key** → downloads a JSON file.
   - Copy into `backend/.env` (and into Vercel's env vars for production):
     - `FIREBASE_ADMIN_PROJECT_ID` ← `project_id`
     - `FIREBASE_ADMIN_CLIENT_EMAIL` ← `client_email`
     - `FIREBASE_ADMIN_PRIVATE_KEY` ← `private_key` (paste as-is, in quotes)
4. **Allowlist**: set `ADMIN_EMAILS` in `backend/.env` (and Vercel) to a
   comma-separated list of the Google account emails allowed to log in, e.g.
   `ADMIN_EMAILS=you@gmail.com,teammate@gmail.com`. Nobody can sign in until
   this is set, even if Firebase itself authenticates them successfully.
5. Redeploy the backend after setting the Vercel env vars.

### Security notes

- Read-only dashboard: there is no delete/edit UI or API for registrations,
  by design, to minimize blast radius.
- CSV export sanitizes every cell against formula/CSV injection (values
  starting with `=`, `+`, `-`, `@` are neutralized) since registration data
  is public user input.
- The session cookie is `httpOnly` (invisible to JS/XSS) + `Secure` in
  production + `SameSite=Strict` (never sent cross-site, which also blocks
  CSRF on the login/logout endpoints). `POST /api/admin/session` additionally
  rejects mismatched `Origin` headers as defense-in-depth.
- The Firebase Admin credentials and `ADMIN_EMAILS` are server-only env vars
  and are never sent to the browser.
- `POST /api/admin/session` is also per-IP rate-limited (20 attempts / 15
  min) as defense-in-depth against scripted brute-forcing, on top of the
  fact that it already requires a real Google sign-in before the allowlist
  is even checked.
- `/admin/:path*` gets a dedicated `Content-Security-Policy` (see
  `backend/next.config.js`) scoped only to the domains Firebase Auth's
  Google sign-in popup actually needs.
