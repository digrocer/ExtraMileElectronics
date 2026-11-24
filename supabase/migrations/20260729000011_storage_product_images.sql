-- Migration 011 — storage RLS for the product-images bucket.
-- The bucket is declared public in config.toml (anon SELECT), but writes to
-- storage.objects still need explicit policies. Staff/admin manage images from the
-- desktop catalogue screen; reads stay public so the storefront can render them.
-- Rollback: drop the four policies below.

create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

create policy product_images_staff_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_staff());

create policy product_images_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_staff())
  with check (bucket_id = 'product-images' and public.is_staff());

create policy product_images_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_staff());
