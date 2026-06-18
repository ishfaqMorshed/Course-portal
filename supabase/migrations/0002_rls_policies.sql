-- ============================================================
-- 0002_rls_policies.sql — RLS for every §3 table.
-- The Edge Function uses the service-role key, which BYPASSES RLS, so all
-- webhook writes (profiles/enrollments/user_segments/ghl_sync_log) work
-- regardless of the policies below. These policies govern the browser
-- (anon/authenticated) clients only.
-- ============================================================

alter table public.courses        enable row level security;
alter table public.modules        enable row level security;
alter table public.lessons        enable row level security;
alter table public.profiles       enable row level security;
alter table public.enrollments    enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.events         enable row level security;
alter table public.upsell_config  enable row level security;
alter table public.ad_rules       enable row level security;
alter table public.segment_config enable row level security;
alter table public.user_segments  enable row level security;
alter table public.ghl_sync_log   enable row level security;

-- ---- profiles: owner read/update -------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- enrollments: owner read (writes = service role) -----------------------
create policy "enrollments_select_own" on public.enrollments
  for select to authenticated using (user_id = auth.uid());

-- ---- catalog: readable only if enrolled in that course ---------------------
create policy "courses_select_enrolled" on public.courses
  for select to authenticated using (
    exists (select 1 from public.enrollments e where e.course_id = courses.id and e.user_id = auth.uid()));

create policy "modules_select_enrolled" on public.modules
  for select to authenticated using (
    exists (select 1 from public.enrollments e where e.course_id = modules.course_id and e.user_id = auth.uid()));

create policy "lessons_select_enrolled" on public.lessons
  for select to authenticated using (
    exists (
      select 1 from public.modules m
      join public.enrollments e on e.course_id = m.course_id and e.user_id = auth.uid()
      where m.id = lessons.module_id));

-- ---- lesson_progress: owner CRUD (used Phase 3) ----------------------------
create policy "lp_select_own" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid());
create policy "lp_insert_own" on public.lesson_progress
  for insert to authenticated with check (user_id = auth.uid());
create policy "lp_update_own" on public.lesson_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- events: owner insert/select (used Phase 3) ----------------------------
create policy "events_select_own" on public.events
  for select to authenticated using (user_id = auth.uid());
create policy "events_insert_own" on public.events
  for insert to authenticated with check (user_id = auth.uid());

-- ---- config: readable if enrolled (wired Phase 5/3) ------------------------
create policy "upsell_select_enrolled" on public.upsell_config
  for select to authenticated using (
    exists (select 1 from public.enrollments e where e.course_id = upsell_config.course_id and e.user_id = auth.uid()));
create policy "adrules_select_enrolled" on public.ad_rules
  for select to authenticated using (
    exists (select 1 from public.enrollments e where e.course_id = ad_rules.course_id and e.user_id = auth.uid()));

-- ---- user_segments: owner read (writes = service role) ---------------------
create policy "segments_select_own" on public.user_segments
  for select to authenticated using (user_id = auth.uid());

-- segment_config + ghl_sync_log: NO client policies → service-role only.
