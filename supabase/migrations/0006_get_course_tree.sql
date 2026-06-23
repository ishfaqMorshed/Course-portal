-- ============================================================
-- 0006_get_course_tree.sql — live course-tree read (CONNECTION-MAP §1).
-- Pulled forward from Phase 3 so the portal (CourseView / Dashboard / sidebar)
-- reads modules + lessons + the caller's per-lesson progress live from the DB
-- instead of fixtures. SECURITY INVOKER → RLS applies (modules/lessons visible
-- if enrolled OR admin; lesson_progress filtered to the caller's own rows).
-- ============================================================

create or replace function public.get_course_tree(p_course_id uuid)
returns table (
  module_id uuid,
  module_sort int,
  module_title text,
  lesson_id uuid,
  lesson_sort int,
  lesson_title text,
  vimeo_id text,
  description text,
  resources jsonb,
  pct numeric,
  last_position int,
  completed_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.id, m.sort, m.title,
    l.id, l.sort, l.title,
    l.vimeo_id, l.description, l.resources,
    coalesce(lp.pct, 0), coalesce(lp.last_position, 0), lp.completed_at
  from public.modules m
  join public.lessons l on l.module_id = m.id
  left join public.lesson_progress lp
    on lp.lesson_id = l.id and lp.user_id = auth.uid()
  where m.course_id = p_course_id
  order by m.sort, l.sort;
$$;

grant execute on function public.get_course_tree(uuid) to authenticated;
