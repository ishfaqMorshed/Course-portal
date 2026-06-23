-- ============================================================
-- 0009_lesson_video_source.sql — multi-source video.
-- Adds lessons.video_source (vimeo/youtube/url). The existing `vimeo_id` column
-- is REUSED as the generic video reference: it now holds a Vimeo ID, a YouTube
-- ID, or a direct video URL depending on video_source (normalized in the admin
-- editor). Phase 3 builds provider-specific players against these two columns.
-- ============================================================

alter table public.lessons
  add column if not exists video_source text not null default 'vimeo'
  check (video_source in ('vimeo', 'youtube', 'url'));

-- Redefine get_course_tree to also return video_source (return-type change →
-- drop + recreate; CREATE OR REPLACE can't alter the RETURNS TABLE columns).
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
    l.vimeo_id, l.video_source, l.description, l.resources,
    coalesce(lp.pct, 0), coalesce(lp.last_position, 0), lp.completed_at
  from public.modules m
  join public.lessons l on l.module_id = m.id
  left join public.lesson_progress lp
    on lp.lesson_id = l.id and lp.user_id = auth.uid()
  where m.course_id = p_course_id
  order by m.sort, l.sort;
$$;

grant execute on function public.get_course_tree(uuid) to authenticated;
