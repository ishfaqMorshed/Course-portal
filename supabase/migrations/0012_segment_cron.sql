-- ============================================================
-- 0012_segment_cron.sql — Phase 4 daily time-based segment job
-- (MASTER §4, CONNECTION-MAP §6). Runs 03:00 UTC.
--
-- Computes the two segments that can't be event-driven:
--   never_activated — enrolled, never logged in, past never_activated_after_days
--   stalled         — started, silent past stalled_after_days, not complete
-- and keeps not_started/active in sync. Thresholds come from segment_config.
--
-- Idempotent: user_segments is written ONLY on a real change, so a re-run makes
-- zero duplicate GHL calls (the user_segments sync trigger fires only on change).
-- completer / dfy_purchased rows are skipped (terminal).
-- ============================================================

create extension if not exists pg_cron;

create or replace function public.run_segment_cron()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_current       text;
  v_target        text;
  v_never_days    int;
  v_stalled_days  int;
  v_has_login     boolean;
  v_has_started   boolean;
  v_has_completed boolean;
  v_last_event    timestamptz;
begin
  for r in
    select e.user_id, e.course_id, e.created_at as enrolled_at
    from public.enrollments e
  loop
    select segment into v_current
    from public.user_segments
    where user_id = r.user_id and course_id = r.course_id;

    -- Terminal states are never recomputed.
    if v_current in ('completer','dfy_purchased') then
      continue;
    end if;

    -- Thresholds (fall back to the §3 defaults if no config row).
    select coalesce(never_activated_after_days, 7),
           coalesce(stalled_after_days, 14)
      into v_never_days, v_stalled_days
    from public.segment_config
    where course_id = r.course_id;
    v_never_days   := coalesce(v_never_days, 7);
    v_stalled_days := coalesce(v_stalled_days, 14);

    v_has_login := exists (
      select 1 from public.events
      where user_id = r.user_id and type = 'login');
    v_has_started := exists (
      select 1 from public.events
      where user_id = r.user_id and course_id = r.course_id and type = 'lesson_started');
    v_has_completed := exists (
      select 1 from public.events
      where user_id = r.user_id and course_id = r.course_id and type = 'course_completed');

    -- A completer that the event trigger already set: leave it (terminal-ish).
    if v_has_completed then
      continue;
    end if;

    -- Most recent activity for this user+course (login is course-agnostic).
    select max(created_at) into v_last_event
    from public.events
    where user_id = r.user_id and (course_id = r.course_id or course_id is null);

    if not v_has_login
       and (now() - r.enrolled_at) > make_interval(days => v_never_days) then
      v_target := 'never_activated';
    elsif v_has_login and not v_has_started then
      v_target := 'not_started';
    elsif v_has_started
          and v_last_event is not null
          and (now() - v_last_event) > make_interval(days => v_stalled_days) then
      v_target := 'stalled';
    elsif v_has_started then
      v_target := 'active';
    else
      -- enrolled, no login, still inside the never_activated window → unchanged.
      v_target := coalesce(v_current, 'never_activated');
    end if;

    if v_target is distinct from v_current then
      insert into public.user_segments (user_id, course_id, segment, changed_at)
      values (r.user_id, r.course_id, v_target, now())
      on conflict (user_id, course_id) do update
        set segment = excluded.segment, changed_at = excluded.changed_at;
    end if;
  end loop;
end;
$$;

-- Schedule daily at 03:00 UTC. Re-runnable: drop any prior schedule first.
do $$
begin
  perform cron.unschedule('segment-daily');
exception when others then
  null;  -- not scheduled yet
end $$;

select cron.schedule('segment-daily', '0 3 * * *', $$select public.run_segment_cron();$$);
