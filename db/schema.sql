-- Run this in your Supabase SQL Editor to set up the registrations table.
--
-- NOTE ON THIS MIGRATION: previously the frontend inserted rows directly
-- using the Supabase anon key, so RLS needed a public "insert" policy.
-- Now ALL database access (including this insert) happens in the Next.js
-- backend using the SERVICE ROLE key, which bypasses RLS entirely. RLS is
-- kept enabled below for defense-in-depth (e.g. if the anon key ever leaks),
-- but the public insert policy is no longer required/created.

create table if not exists registrations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  student_email text not null,
  student_id text not null, -- Student Registration ID (lead builder)
  faculty text not null,
  department text not null,
  year_of_study text not null,
  team_name text not null,
  team_size int not null check (team_size >= 1 and team_size <= 3),
  members jsonb not null default '[]'::jsonb, -- [{ "name": "...", "student_id": "..." }, ...] for members 2 & 3
  tools_interested text[], -- Array containing Qoder, QoderWork, MuleRun
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- If you already created this table with the old schema, run this once to
-- add the new column without losing existing data:
-- alter table registrations add column if not exists members jsonb not null default '[]'::jsonb;

-- Enable Row Level Security (RLS)
alter table registrations enable row level security;

-- Only the service role (used exclusively by the backend) can insert. No
-- public/anon insert policy is defined, since the frontend never talks to
-- Supabase directly anymore.

-- Allow authenticated users to read their own registration row.
drop policy if exists "Allow read for owner" on registrations;
create policy "Allow read for owner"
on registrations for select
to authenticated
using (auth.uid() = user_id);

-- Project Brief Submissions Table (One submission per team, subsequent submissions overwrite)
create table if not exists submissions (
  id uuid default gen_random_uuid() primary key,
  participant_email text not null,
  team_name text not null unique,
  whatsapp_number text not null,
  project_brief text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table submissions enable row level security;

-- MIGRATION (2026-08): fixes a bug where two teams that happened to share
-- the same team_name would silently overwrite each other's project brief,
-- because `submissions` was keyed on the team_name STRING (see the `unique`
-- constraint above) instead of a stable identifier. This links each
-- submission to its actual registration row instead, so identity no longer
-- depends on a human-typed name.
--
-- Purely additive - no rows are deleted, no existing data is overwritten.
-- Run this once in the Supabase SQL Editor.

-- 1. Add the new column (nullable at first, so existing rows aren't rejected).
alter table submissions add column if not exists registration_id uuid references registrations(id);

-- 2. Backfill registration_id for existing submissions by matching the
--    submitter's participant_email against the registration lead or any
--    team member's email. This correctly tells apart teams that share a
--    team_name, unlike the old ilike(team_name) matching.
update submissions s
set registration_id = r.id
from registrations r
where s.registration_id is null
  and (
    lower(r.student_email) = lower(s.participant_email)
    or exists (
      select 1 from jsonb_array_elements(r.members) as m
      where lower(m->>'email') = lower(s.participant_email)
    )
  );

-- 3. Drop the old name-based unique constraint - this was the actual bug,
--    it made the app treat "same name" as "same team".
alter table submissions drop constraint if exists submissions_team_name_key;

-- 4. Enforce true one-submission-per-team using the stable id instead.
--    Partial index so any legacy row that couldn't be backfilled (e.g. the
--    submitter's email doesn't match any registration) doesn't block
--    others - check for those with the query below and resolve manually.
create unique index if not exists submissions_registration_id_key
  on submissions (registration_id)
  where registration_id is not null;

-- 5. Sanity check after running the above - should return zero rows once
--    every historical submission has been matched to a team:
--    select id, team_name, participant_email from submissions where registration_id is null;


-- New Project Submission Portal table (Independent)
create table if not exists project_submissions (
  id uuid default gen_random_uuid() primary key,
  registration_id uuid references registrations(id) not null,
  participant_email text not null,
  problem text not null,
  solution text not null,
  ai_usage text not null,
  technical_brief text not null,
  impact text not null,
  roadmap text not null,
  demo_video text not null,
  source_repo text not null,
  hosted_prototype text not null,
  ai_usage_statement text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (registration_id)
);

alter table project_submissions enable row level security;
