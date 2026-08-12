-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).

create table if not exists player_rankings (
  id bigint generated always as identity primary key,
  normalized_name text not null,
  player_name text not null,
  team text,
  pos text,
  scoring_format text not null check (scoring_format in ('ppr', 'half-ppr')),
  espn_rank integer not null,
  fpros_rank integer,
  avg_pick numeric,
  diff integer,
  updated_at timestamptz not null default now(),
  unique (normalized_name, scoring_format)
);

create index if not exists player_rankings_format_rank_idx
  on player_rankings (scoring_format, espn_rank);

-- The app talks to Supabase with the anon key from a server-only module
-- (never shipped to the browser), so this policy just needs to allow that
-- key to read/write. There's no end-user auth in this app.
alter table player_rankings enable row level security;

create policy "Allow anon full access to player_rankings"
  on player_rankings
  for all
  to anon
  using (true)
  with check (true);
