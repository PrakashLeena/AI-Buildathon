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
├── backend/                  # Next.js API-only app
│   ├── pages/api/
│   │   ├── health.js
│   │   └── registrations/index.js   # Creates Supabase Auth user + registrations row
│   ├── lib/supabaseAdmin.js  # Service-role Supabase client (server-only)
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
