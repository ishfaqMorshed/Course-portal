-- ============================================================
-- 0005_admin.sql — Phase 2.7 Admin Dashboard.
-- Adds: profiles.is_admin flag · ad_rules target columns (Option A) ·
-- is_admin() SECURITY DEFINER helper · admin RLS on every content/config table.
--
-- RLS model: admin policies are ADDITIVE and permissive (OR'd with the existing
-- read-if-enrolled policies). Result per table:
--   SELECT  → enrolled OR admin
--   INSERT/UPDATE/DELETE → admin only (no other write policy exists → non-admins
--                          are denied). Service role still bypasses RLS entirely.
-- Every client-side insert/update/delete on courses/modules/lessons/upsell_config/
-- ad_rules/segment_config is therefore gated on public.is_admin().
-- ============================================================

-- 1. Admin flag (MASTER §3).
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2. ad_rules target columns — Option A "scope + target picker" (MASTER §3).
--    NULL = course-wide; module_id set for scope='module'; lesson_id for scope='lesson'.
alter table public.ad_rules
  add column if not exists module_id uuid references public.modules(id) on delete cascade,
  add column if not exists lesson_id uuid references public.lessons(id) on delete cascade;

-- 3. Admin check as SECURITY DEFINER → runs as owner, bypassing RLS on profiles,
--    so policies that call it never recurse into profiles' own policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.user_id = auth.uid()), false);
$$;
grant execute on function public.is_admin() to authenticated;

-- 4. Admin policies (FOR ALL → covers select/insert/update/delete in one policy).
--    USING gates which rows are visible/updatable/deletable; WITH CHECK gates writes.
create policy "courses_admin_all" on public.courses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "modules_admin_all" on public.modules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "lessons_admin_all" on public.lessons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "upsell_admin_all" on public.upsell_config
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "adrules_admin_all" on public.ad_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- segment_config previously had NO client policy (service-role only) → admins get read+write.
create policy "segmentcfg_admin_all" on public.segment_config
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
