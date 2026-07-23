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
