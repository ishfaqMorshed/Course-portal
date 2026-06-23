-- ============================================================
-- 0008_storage_upsell_images.sql — public Storage bucket for upsell promo art.
-- Bucket is public (read via public URL); writes restricted to admins via the
-- existing public.is_admin() helper. upsell_config.image_url (0007) stores the
-- resulting public URL.
--
-- If `supabase db push` lacks privileges on the storage schema, run the same
-- statements in the dashboard SQL editor (see PHASE notes / runbook).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('upsell-images', 'upsell-images', true)
on conflict (id) do nothing;

-- Public read of this bucket's objects (so the portal <img> works without auth).
drop policy if exists "upsell_images_public_read" on storage.objects;
create policy "upsell_images_public_read" on storage.objects
  for select to public
  using (bucket_id = 'upsell-images');

-- Admin-only write (insert/update/delete) — gated on public.is_admin().
drop policy if exists "upsell_images_admin_write" on storage.objects;
create policy "upsell_images_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'upsell-images' and public.is_admin())
  with check (bucket_id = 'upsell-images' and public.is_admin());
