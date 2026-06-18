-- ============================================================
-- 0003_seed_catalog.sql — single v1 course catalog.
-- Course title is the real $47 product ("The E-commerce Launch Blueprint").
-- Curriculum (4 modules / 13 lessons) mirrors the approved design fixtures as
-- placeholder content; real curriculum is Phase 0 Track B and can be updated
-- later without schema change. None of these lesson titles surface in the
-- Phase 2 EXIT path (My Courses shows title + lesson count only).
--
-- Idempotent: re-running is a no-op (course slug conflict short-circuits the
-- data-modifying CTEs, which is why the main statement reads from CTE `c`).
-- ============================================================

with c as (
  insert into public.courses (slug, title, status)
  values ('ecommerce-launch-blueprint', 'The E-commerce Launch Blueprint', 'published')
  on conflict (slug) do nothing
  returning id
),
m as (
  insert into public.modules (course_id, sort, title)
  select c.id, v.sort, v.title
  from c cross join (values
    (1, 'Foundations'),
    (2, 'Finding Your Niche'),
    (3, 'Building the System'),
    (4, 'Launch & Scale')
  ) as v(sort, title)
  returning id, title
),
l as (
  insert into public.lessons (module_id, sort, title, vimeo_id, description, resources)
  select m.id, d.sort, d.title, d.vimeo_id, null, d.resources::jsonb
  from (values
    ('Foundations',         1, 'Welcome & How This Works', 'vimeo-m1l1', '[]'),
    ('Foundations',         2, 'The AI Profit Mindset',    'vimeo-m1l2', '[]'),
    ('Foundations',         3, 'Setting Up Your Toolkit',  'vimeo-m1l3', '[{"id":"r1","name":"Toolkit Checklist.pdf","size":"1.2 MB","kind":"pdf"},{"id":"r2","name":"Starter Prompts.txt","size":"8 KB","kind":"txt"}]'),
    ('Finding Your Niche',  1, 'Market Research with AI',  'vimeo-m2l1', '[]'),
    ('Finding Your Niche',  2, 'Validating Demand Fast',   'vimeo-m2l2', '[]'),
    ('Finding Your Niche',  3, 'Choosing Your First Offer','vimeo-m2l3', '[]'),
    ('Finding Your Niche',  4, 'Niche Worksheet',           null,        '[{"id":"r3","name":"Niche Worksheet.pdf","size":"640 KB","kind":"pdf"}]'),
    ('Building the System', 1, 'Your Automation Stack',    'vimeo-m3l1', '[]'),
    ('Building the System', 2, 'Content Pipelines',        'vimeo-m3l2', '[]'),
    ('Building the System', 3, 'Pricing & Packaging',      'vimeo-m3l3', '[]'),
    ('Launch & Scale',      1, 'Your First 10 Customers',  'vimeo-m4l1', '[]'),
    ('Launch & Scale',      2, 'Scaling Without Burnout',  'vimeo-m4l2', '[]'),
    ('Launch & Scale',      3, 'What''s Next After Launch','vimeo-m4l3', '[]')
  ) as d(module_title, sort, title, vimeo_id, resources)
  join m on m.title = d.module_title
  returning id
)
insert into public.segment_config (course_id, stalled_after_days, never_activated_after_days)
select id, 14, 7 from c
on conflict (course_id) do nothing;
