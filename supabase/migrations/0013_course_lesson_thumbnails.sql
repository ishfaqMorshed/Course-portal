-- ============================================================
-- 0013_course_lesson_thumbnails.sql — Phase 7 step 1: course + lesson thumbnails.
-- Adds courses.thumbnail_url + lessons.thumbnail_url (public URL of an image in
-- the EXISTING public `upsell-images` bucket — reused, no new bucket/policies).
-- The portal renders these object-fit cover in fixed-aspect boxes; NULL/'' falls
-- back to the placeholder. The read RPCs are widened to return the new columns,
-- which changes their result signature → drop + recreate (CREATE OR REPLACE can't
-- alter a function's OUT columns).
-- ============================================================

alter table public.courses add column if not exists thumbnail_url text;
alter table public.lessons add column if not exists thumbnail_url text;

-- ---- get_course_tree: now also returns the lesson thumbnail ------------------
drop function if exists public.get_course_tree(uuid);

create function public.get_course_tree(p_course_id uuid)
returns table (
  module_id uuid,
  module_sort int,
  module_title text,
  lesson_id uuid,
  lesson_sort int,
  lesson_title text,
  vimeo_id text,
  video_source text,
  description text,
  resources jsonb,
  thumbnail_url text,
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
    l.vimeo_id, l.video_source, l.description, l.resources, l.thumbnail_url,
    coalesce(lp.pct, 0), coalesce(lp.last_position, 0), lp.completed_at
  from public.modules m
  join public.lessons l on l.module_id = m.id
  left join public.lesson_progress lp
    on lp.lesson_id = l.id and lp.user_id = auth.uid()
  where m.course_id = p_course_id
  order by m.sort, l.sort;
$$;

grant execute on function public.get_course_tree(uuid) to authenticated;

-- ---- get_enrolled_courses: now also returns the course thumbnail ------------
drop function if exists public.get_enrolled_courses();

create function public.get_enrolled_courses()
returns table (
  course_id uuid,
  slug text,
  title text,
  thumbnail_url text,
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
    c.thumbnail_url,
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
  group by c.id, c.slug, c.title, c.thumbnail_url;
$$;

grant execute on function public.get_enrolled_courses() to authenticated;
