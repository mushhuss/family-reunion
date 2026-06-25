-- ============================================================
-- Family Reunion – Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- One row per reunion year
create table if not exists reunions (
  id              uuid primary key default gen_random_uuid(),
  year            integer not null unique,
  title           text not null,
  welcome_message text,
  hero_image_url  text,
  created_at      timestamptz not null default now()
);

-- Photos and videos uploaded by family members
-- Videos are stored in R2 but type='video' rows are not rendered on the frontend
create table if not exists media (
  id          uuid primary key default gen_random_uuid(),
  reunion_id  uuid not null references reunions(id) on delete cascade,
  url         text not null,
  r2_key      text not null,
  type        text not null check (type in ('photo', 'video')),
  caption     text,
  uploaded_by text,
  created_at  timestamptz not null default now()
);

-- Program schedule events for a reunion
create table if not exists program_events (
  id          uuid primary key default gen_random_uuid(),
  reunion_id  uuid not null references reunions(id) on delete cascade,
  title       text not null,
  description text,
  event_date  date,
  start_time  time,
  end_time    time,
  location    text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Relevant links for a reunion
create table if not exists links (
  id          uuid primary key default gen_random_uuid(),
  reunion_id  uuid not null references reunions(id) on delete cascade,
  title       text not null,
  url         text not null,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Point of contacts for a reunion
create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  reunion_id  uuid not null references reunions(id) on delete cascade,
  name        text not null,
  role        text not null,
  phone       text,
  email       text,
  sort_order  integer not null default 0
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists media_reunion_id_idx         on media          (reunion_id);
create index if not exists media_created_at_idx         on media          (created_at desc);
create index if not exists program_events_reunion_id_idx on program_events (reunion_id);
create index if not exists links_reunion_id_idx         on links          (reunion_id);
create index if not exists contacts_reunion_id_idx      on contacts       (reunion_id);

-- ============================================================
-- Row Level Security
-- Public read for all tables; public insert for media (uploads).
-- Admin writes (program_events, links, contacts, reunions) go
-- through the service role key from the admin page.
-- ============================================================

alter table reunions       enable row level security;
alter table media          enable row level security;
alter table program_events enable row level security;
alter table links          enable row level security;
alter table contacts       enable row level security;

-- Reunions: anyone can read; admin page handles writes
create policy "reunions_select" on reunions for select using (true);
create policy "reunions_insert" on reunions for insert with check (true);
create policy "reunions_update" on reunions for update using (true);
create policy "reunions_delete" on reunions for delete using (true);

-- Media: anyone can read and upload
create policy "media_select" on media for select using (true);
create policy "media_insert" on media for insert with check (true);
create policy "media_delete" on media for delete using (true);

-- Program events: anyone can read; admin page handles writes
create policy "program_events_select" on program_events for select using (true);
create policy "program_events_insert" on program_events for insert with check (true);
create policy "program_events_update" on program_events for update using (true);
create policy "program_events_delete" on program_events for delete using (true);

-- Links: anyone can read; admin page handles writes
create policy "links_select" on links for select using (true);
create policy "links_insert" on links for insert with check (true);
create policy "links_update" on links for update using (true);
create policy "links_delete" on links for delete using (true);

-- Contacts: anyone can read; admin page handles writes
create policy "contacts_select" on contacts for select using (true);
create policy "contacts_insert" on contacts for insert with check (true);
create policy "contacts_update" on contacts for update using (true);
create policy "contacts_delete" on contacts for delete using (true);

-- ============================================================
-- Realtime: live photo feed updates
-- ============================================================

alter publication supabase_realtime add table media;
