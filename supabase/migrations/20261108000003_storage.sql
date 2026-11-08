-- Taach: file storage. Paths always start with the owner's user id:
--   item-photos/<user>/<item>/<n>.jpg   public read (listing photos)
--   claims/<user>/<order>/<n>.jpg       private: owner, the other party of the order, admins
--   id-docs/<user>/front.jpg|back.jpg   private: owner (write only) and admins

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('item-photos', 'item-photos', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('claims', 'claims', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('id-docs', 'id-docs', false, 5242880, array['image/jpeg','image/png'])
on conflict (id) do nothing;

create policy "upload own item photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own item photos" on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "upload own claim photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'claims' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read claim photos" on storage.objects for select to authenticated
  using (bucket_id = 'claims' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
    or exists (select 1 from public.orders o where o.id::text = (storage.foldername(name))[2] and auth.uid() in (o.buyer_id, o.seller_id))));

create policy "upload own id docs" on storage.objects for insert to authenticated
  with check (bucket_id = 'id-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admins read id docs" on storage.objects for select to authenticated
  using (bucket_id = 'id-docs' and public.is_admin());
