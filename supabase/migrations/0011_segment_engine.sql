-- ============================================================
-- 0011_segment_engine.sql — Phase 4 segment engine (compute + sync split)
-- (MASTER §4/§5, CONNECTION-MAP §2/§5/§6).
--
-- Two triggers separate DERIVING the segment from SYNCING the tag to GHL:
--
--   events INSERT ─trg_event_recompute─▶ recompute_segment() ─writes─▶ user_segments
--   user_segments INS/UPD ─trg_segment_sync─▶ notify_segment_change() ─pg_net─▶ sync-segment-tag
--
-- The sync trigger only calls GHL WHEN the segment actually changed, so re-runs
-- (cron, re-fired webhooks, changed_at-only touches) never duplicate GHL calls.
--
-- All trigger functions are SECURITY DEFINER (owned by the migration role) so
-- they can write user_segments despite its service-role-only write RLS, and so
-- they can call net.http_post / read Vault.
-- ============================================================

create extension if not exists pg_net;

-- ------------------------------------------------------------
-- recompute_segment(user, course) — event-driven forward transitions only.
--   never_activated → not_started → active → completer
-- Time-based states (never_activated re-evaluation, stalled) are the cron's job.
-- Rules: dfy_purchased is terminal; completer is never downgraded here.
-- ------------------------------------------------------------
create or replace function public.recompute_segment(p_user uuid, p_course uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
  v_target  text;
begin
  select segment into v_current
  from public.user_segments
  where user_id = p_user and course_id = p_course;

  -- Terminal: a DFY buyer never transitions away (suppress all upsell sequences).
  if v_current = 'dfy_purchased' then
    return;
  end if;

  -- Derive the furthest forward state implied by the events table.
  if exists (
    select 1 from public.events
    where user_id = p_user and course_id = p_course and type = 'course_completed'
  ) then
    v_target := 'completer';
  elsif exists (
    select 1 from public.events
    where user_id = p_user and course_id = p_course and type = 'lesson_started'
  ) then
    v_target := 'active';
  elsif exists (
    -- login carries course_id = NULL → evaluated user-wide.
    select 1 from public.events
    where user_id = p_user and type = 'login'
  ) then
    v_target := 'not_started';
  else
    return;  -- no event basis to move off never_activated
  end if;

  -- Never downgrade a completer via event-driven logic.
  if v_current = 'completer' and v_target <> 'completer' then
    return;
  end if;

  -- Write only on a real change (keeps the sync trigger idempotent).
  if v_current is distinct from v_target then
    insert into public.user_segments (user_id, course_id, segment, changed_at)
    values (p_user, p_course, v_target, now())
    on conflict (user_id, course_id) do update
      set segment = excluded.segment, changed_at = excluded.changed_at;
  end if;
end;
$$;

-- Trigger body: route an event to the right (user, course) recompute(s).
create or replace function public.on_event_recompute()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.course_id is not null then
    perform public.recompute_segment(NEW.user_id, NEW.course_id);
  else
    -- login (course_id NULL) → recompute every enrollment for this user.
    perform public.recompute_segment(NEW.user_id, e.course_id)
    from public.enrollments e
    where e.user_id = NEW.user_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_event_recompute on public.events;
create trigger trg_event_recompute
after insert on public.events
for each row
when (NEW.type in ('login','lesson_started','lesson_completed','course_completed'))
execute function public.on_event_recompute();

-- ------------------------------------------------------------
-- notify_segment_change() — on a real segment change, fire sync-segment-tag via
-- pg_net. The edge function URL + shared secret are read from Supabase Vault
-- (set once by the operator — see Phase 4 EXIT notes). If Vault isn't populated
-- the function no-ops gracefully so writes never break.
-- ------------------------------------------------------------
create or replace function public.notify_segment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base   text;
  v_secret text;
begin
  -- Skip no-op updates (e.g. changed_at-only touch) → no duplicate GHL call.
  if TG_OP = 'UPDATE' and OLD.segment is not distinct from NEW.segment then
    return null;
  end if;

  select decrypted_secret into v_base
  from vault.decrypted_secrets where name = 'edge_base_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'sync_segment_tag_secret';

  if v_base is null or v_secret is null then
    return null;  -- not configured yet → don't break the write
  end if;

  perform net.http_post(
    url     := v_base || '/sync-segment-tag',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-webhook-secret', v_secret
               ),
    body    := jsonb_build_object(
                 'user_id',     NEW.user_id,
                 'course_id',   NEW.course_id,
                 'old_segment', case when TG_OP = 'UPDATE' then OLD.segment else null end,
                 'new_segment', NEW.segment
               )
  );
  return null;
end;
$$;

drop trigger if exists trg_segment_sync on public.user_segments;
create trigger trg_segment_sync
after insert or update on public.user_segments
for each row
execute function public.notify_segment_change();
