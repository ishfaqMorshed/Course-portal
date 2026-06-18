-- ============================================================
-- 0001_init_schema.sql — full data model (MASTER.md §3).
-- All tables created now (single source of truth); only a subset is wired
-- in Phase 2. Enum CHECKs use the exact value sets from §3/§4.
-- ============================================================

create extension if not exists pgcrypto;

-- courses(id, slug, title, status)
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft','published','archived'))
);

-- modules(id, course_id, sort, title)
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  sort int not null,
  title text not null
);

-- lessons(id, module_id, sort, title, vimeo_id NULLABLE, description, resources JSONB)
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  sort int not null,
  title text not null,
  vimeo_id text,                                    -- NULLABLE → no-video lesson (D1 manual complete)
  description text,
  resources jsonb not null default '[]'::jsonb
);

-- users -- Supabase auth.users + profiles(user_id, ghl_contact_id, email)
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ghl_contact_id text unique,
  email text not null
);

-- enrollments(id, user_id, course_id, source, created_at)
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)                       -- idempotency: re-fired purchase webhook is a no-op
);

-- lesson_progress(id, user_id, lesson_id, seconds_watched, pct, completed_at NULLABLE, last_position)
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  seconds_watched int not null default 0,
  pct numeric not null default 0,
  completed_at timestamptz,
  last_position int not null default 0,
  unique (user_id, lesson_id)                       -- idempotency: one progress row per user+lesson
);

-- events(id, user_id, course_id, type, payload JSONB, created_at)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  type text not null check (type in
    ('login','lesson_started','lesson_completed','course_completed',
     'upsell_view','upsell_click','ad_view','ad_skip','ad_click')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- upsell_config(id, course_id, module_id NULLABLE, placement, headline, body, cta_label, cta_url, intensity)
create table public.upsell_config (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,  -- NULL → global (sidebar_promo)
  placement text not null check (placement in ('rail','sidebar_promo','completion')),
  headline text not null,
  body text not null,
  cta_label text not null,
  cta_url text not null,
  intensity int not null check (intensity between 1 and 5)
);

-- ad_rules(id, course_id, scope, trigger_type, trigger_value, skippable_after_s, asset_url, cta_url, active)
create table public.ad_rules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  scope text not null check (scope in ('course','module','lesson')),
  trigger_type text not null check (trigger_type in ('pct','timestamp_s')),
  trigger_value numeric not null,
  skippable_after_s int not null default 0,
  asset_url text,
  cta_url text,
  active boolean not null default true
);

-- segment_config(course_id, stalled_after_days, never_activated_after_days, ...)
create table public.segment_config (
  course_id uuid primary key references public.courses(id) on delete cascade,
  stalled_after_days int not null default 14,
  never_activated_after_days int not null default 7
);

-- user_segments(user_id, course_id, segment, changed_at) -- one row per user+course
create table public.user_segments (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  segment text not null check (segment in
    ('never_activated','not_started','active','stalled','completer','dfy_purchased')),
  changed_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- ghl_sync_log(id, user_id, action, tag, status, response, created_at) -- audit trail
create table public.ghl_sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  tag text,
  status text not null check (status in ('success','failed')),
  response jsonb,
  created_at timestamptz not null default now()
);

-- supporting indexes
create index on public.modules(course_id);
create index on public.lessons(module_id);
create index on public.enrollments(user_id);
create index on public.lesson_progress(user_id);
create index on public.events(user_id);
create index on public.ghl_sync_log(action);
