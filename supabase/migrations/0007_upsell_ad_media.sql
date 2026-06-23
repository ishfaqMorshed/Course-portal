-- ============================================================
-- 0007_upsell_ad_media.sql — Phase 2.7-fix follow-up.
-- Adds editable media/copy fields the UI needed but the schema lacked:
--   upsell_config.image_url — promo art (URL; no Storage)
--   ad_rules.headline / ad_rules.cta_label — ad overlay copy (asset_url already
--     exists and serves as the ad image)
-- All nullable; admins set them in /admin. (MASTER §3 updated.)
-- ============================================================

alter table public.upsell_config add column if not exists image_url text;

alter table public.ad_rules add column if not exists headline text;
alter table public.ad_rules add column if not exists cta_label text;
