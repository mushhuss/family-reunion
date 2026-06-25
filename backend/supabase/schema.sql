-- ============================================================
-- DispoCam – Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Sessions: each guest's temporary camera roll
create table if not exists sessions (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  photos_remaining integer not null default 10,
  created_at       timestamptz not null default now()
);

-- Photos: each captured image
create table if not exists photos (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  image_url  text not null,
  created_at timestamptz not null default now()
);

-- Comments: per-photo guest comments
create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid not null references photos(id) on delete cascade,
  name       text not null,
  text       text not null,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists photos_session_id_idx  on photos  (session_id);
create index if not exists photos_created_at_idx  on photos  (created_at desc);
create index if not exists comments_photo_id_idx  on comments (photo_id);
create index if not exists comments_created_at_idx on comments (created_at asc);

-- ============================================================
-- Row Level Security
-- This is a public wedding app: all guests can read/write.
-- Enable RLS so the policies are enforced.
-- ============================================================

alter table sessions enable row level security;
alter table photos    enable row level security;
alter table comments  enable row level security;

-- Sessions: anyone can create a session and read all sessions
create policy "sessions_select" on sessions for select using (true);
create policy "sessions_insert" on sessions for insert with check (true);
create policy "sessions_update" on sessions for update using (true);

-- Photos: anyone can insert a photo and read all photos
create policy "photos_select" on photos for select using (true);
create policy "photos_insert" on photos for insert with check (true);

-- Comments: anyone can insert a comment and read all comments
create policy "comments_select" on comments for select using (true);
create policy "comments_insert" on comments for insert with check (true);

-- ============================================================
-- Realtime: enable publications for live album updates
-- ============================================================

alter publication supabase_realtime add table photos;
alter publication supabase_realtime add table comments;
