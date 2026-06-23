-- ============================================================
-- 0010_complete_lesson.sql — Phase 3 completion path (MASTER §3/§6, CONNECTION-MAP §2/§3).
--
-- complete_lesson(p_lesson_id) is the SINGLE completion entry point shared by
-- both the 70%-auto path and the manual "Mark complete" button. It:
--   1. sets lesson_progress.completed_at (only if currently NULL — idempotent),
--   2. writes the `lesson_completed` event when newly completed,
--   3. writes the `course_completed` event when every lesson is done,
--   4. returns (newly_completed, course_completed) so the client fires the GHL
--      push (push-lesson-event) ONLY on a NEW completion.
--
-- SECURITY INVOKER → the caller's own RLS applies (owner-insert on
-- lesson_progress/events; enrolled-read on lessons/modules). No new policies.
--
-- Idempotency is also enforced at the DB level by unique partial indexes so a
-- double-fire (auto + manual, or a retry) can never duplicate an event.
-- ============================================================

-- One lesson_completed per user+lesson; one course_completed per user+course.
create unique index if not exists events_lesson_completed_uniq
  on public.events (user_id, (payload->>'lesson_id'))
  where type = 'lesson_completed';

create unique index if not exists events_course_completed_uniq
  on public.events (user_id, course_id)
  where type = 'course_completed';

create or replace function public.complete_lesson(p_lesson_id uuid)
returns table (newly_completed boolean, course_completed boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_course uuid;
  v_prev   boolean;   -- was this lesson already completed?
  v_newly  boolean := false;
  v_total  int;
  v_done   int;
  v_course_done boolean := false;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- Resolve the owning course (also acts as an existence/visibility check).
  select m.course_id into v_course
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where l.id = p_lesson_id;
  if v_course is null then
    raise exception 'lesson not found or not visible: %', p_lesson_id;
  end if;

  -- Was there already a completed row?
  select (lp.completed_at is not null) into v_prev
  from public.lesson_progress lp
  where lp.user_id = v_user and lp.lesson_id = p_lesson_id;
  v_newly := not coalesce(v_prev, false);

  -- Set completed_at only if not already set. On first insert (e.g. manual
  -- complete of an untouched / no-video lesson) seed pct=100; on the conflict
  -- path leave the real watched pct intact (completion ≠ 100% watched at 70%).
  insert into public.lesson_progress as lp (user_id, lesson_id, completed_at, pct)
  values (v_user, p_lesson_id, now(), 100)
  on conflict (user_id, lesson_id) do update
    set completed_at = coalesce(lp.completed_at, excluded.completed_at);

  -- lesson_completed event (only when newly completed; index dedupes regardless).
  if v_newly then
    insert into public.events (user_id, course_id, type, payload)
    values (v_user, v_course, 'lesson_completed',
            jsonb_build_object('lesson_id', p_lesson_id::text))
    on conflict (user_id, (payload->>'lesson_id')) where type = 'lesson_completed'
      do nothing;
  end if;

  -- All lessons done? → course_completed (idempotent via the unique index).
  select count(*) into v_total
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.course_id = v_course;

  select count(*) into v_done
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  join public.modules m on m.id = l.module_id
  where m.course_id = v_course
    and lp.user_id = v_user
    and lp.completed_at is not null;

  if v_total > 0 and v_done >= v_total then
    v_course_done := true;
    insert into public.events (user_id, course_id, type, payload)
    values (v_user, v_course, 'course_completed',
            jsonb_build_object('course_id', v_course::text))
    on conflict (user_id, course_id) where type = 'course_completed'
      do nothing;
  end if;

  return query select v_newly, v_course_done;
end;
$$;

grant execute on function public.complete_lesson(uuid) to authenticated;
