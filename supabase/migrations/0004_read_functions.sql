-- ============================================================
-- 0004_read_functions.sql — read RPC for the My Courses grid.
-- CONNECTION-MAP §1: get_enrolled_courses(user) → "view joining
-- enrollments→courses + progress %". Implemented as a SECURITY INVOKER
-- function so the caller's RLS applies (a user only ever sees their own
-- enrollments). In Phase 2 lesson_progress is empty, so completed=0 / pct=0.
-- ============================================================

create or replace function public.get_enrolled_courses()
returns table (
  course_id uuid,
  slug text,
  title text,
  total_lessons bigint,
  completed_lessons bigint,
  pct int
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id as course_id,
    c.slug,
    c.title,
    count(l.id) as total_lessons,
    count(lp.completed_at) as completed_lessons,
    case when count(l.id) = 0 then 0
         else round(count(lp.completed_at)::numeric * 100 / count(l.id))::int
    end as pct
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  left join public.modules m on m.course_id = c.id
  left join public.lessons l on l.module_id = m.id
  left join public.lesson_progress lp
    on lp.lesson_id = l.id and lp.user_id = e.user_id and lp.completed_at is not null
  where e.user_id = auth.uid()
  group by c.id, c.slug, c.title;
$$;

grant execute on function public.get_enrolled_courses() to authenticated;
