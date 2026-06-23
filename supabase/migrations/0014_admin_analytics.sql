-- ============================================================
-- 0014_admin_analytics.sql — Phase 7 step 2: admin analytics + student mgmt.
-- Six READ-ONLY RPCs for the /admin analytics + students pages. Each is
-- SECURITY DEFINER (so it can read across all users) but gated on public.is_admin()
-- at the top — a non-admin caller gets `not authorized`. No new tables, no writes,
-- no segment changes; raw events/profiles/segments stay owner-locked under RLS.
-- Revenue is enrollments × $47, computed client-side from these counts.
-- ============================================================

-- 1. Top-line KPIs (one row).
create or replace function public.admin_kpis()
returns table (
  total_students bigint,
  total_enrollments bigint,
  lesson_completions bigint,
  course_completions bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select
      (select count(distinct e.user_id) from public.enrollments e),
      (select count(*) from public.enrollments e),
      (select count(*) from public.events ev where ev.type = 'lesson_completed'),
      (select count(*) from public.events ev where ev.type = 'course_completed');
end;
$$;
grant execute on function public.admin_kpis() to authenticated;

-- 2. Students per current segment (donut). user_segments is one row per user+course.
create or replace function public.admin_segment_counts()
returns table (segment text, n bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select us.segment, count(*)
    from public.user_segments us
    group by us.segment
    order by us.segment;
end;
$$;
grant execute on function public.admin_segment_counts() to authenticated;

-- 3. Upsell + ad engagement counts (bars). Upsell rows carry payload.placement;
--    ad rows have no placement → NULL. Client pivots by type/placement.
create or replace function public.admin_engagement_counts()
returns table (type text, placement text, n bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select ev.type, (ev.payload->>'placement') as placement, count(*)
    from public.events ev
    where ev.type in ('upsell_view','upsell_click','ad_view','ad_skip','ad_click')
    group by ev.type, (ev.payload->>'placement')
    order by ev.type;
end;
$$;
grant execute on function public.admin_engagement_counts() to authenticated;

-- 4. Lesson completion counts per lesson (bar). lesson_completed events store
--    payload.lesson_id as text → join back to lessons for the title.
create or replace function public.admin_lesson_completions()
returns table (lesson_id uuid, lesson_title text, n bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select l.id, l.title, count(*)
    from public.events ev
    join public.lessons l on l.id = (ev.payload->>'lesson_id')::uuid
    where ev.type = 'lesson_completed'
    group by l.id, l.title
    order by count(*) desc, l.title;
end;
$$;
grant execute on function public.admin_lesson_completions() to authenticated;

-- 5. Student roster (one row per enrollment = per student in single-course v1).
create or replace function public.admin_students()
returns table (
  user_id uuid,
  email text,
  segment text,
  completed_lessons bigint,
  total_lessons bigint,
  last_active timestamptz,
  enrolled_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select
      e.user_id,
      p.email,
      us.segment,
      (select count(*)
         from public.lesson_progress lp
         join public.lessons l on l.id = lp.lesson_id
         join public.modules m on m.id = l.module_id
        where lp.user_id = e.user_id and m.course_id = e.course_id
          and lp.completed_at is not null),
      (select count(*)
         from public.lessons l
         join public.modules m on m.id = l.module_id
        where m.course_id = e.course_id),
      (select max(ev.created_at) from public.events ev where ev.user_id = e.user_id),
      e.created_at
    from public.enrollments e
    join public.profiles p on p.user_id = e.user_id
    left join public.user_segments us
      on us.user_id = e.user_id and us.course_id = e.course_id
    order by e.created_at desc;
end;
$$;
grant execute on function public.admin_students() to authenticated;

-- 6. Per-student event history (drill-down). Capped to the most recent 200.
create or replace function public.admin_student_events(p_user_id uuid)
returns table (created_at timestamptz, type text, payload jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select ev.created_at, ev.type, ev.payload
    from public.events ev
    where ev.user_id = p_user_id
    order by ev.created_at desc
    limit 200;
end;
$$;
grant execute on function public.admin_student_events(uuid) to authenticated;
