-- 1. Make uploads bucket private
update storage.buckets set public = false where id = 'uploads';

-- 2. Add storage.objects policies for the uploads bucket (folder-based ownership)
drop policy if exists "Users read own upload objects" on storage.objects;
create policy "Users read own upload objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'uploads'
  and (auth.uid()::text = (storage.foldername(name))[1] or has_role(auth.uid(), 'admin'))
);

drop policy if exists "Users write own upload objects" on storage.objects;
create policy "Users write own upload objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users update own upload objects" on storage.objects;
create policy "Users update own upload objects"
on storage.objects for update to authenticated
using (
  bucket_id = 'uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users delete own upload objects" on storage.objects;
create policy "Users delete own upload objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Tighten profiles read policy: own row only (admins see all)
drop policy if exists "Profiles readable by authenticated" on public.profiles;
create policy "Users read own profile"
on public.profiles for select to authenticated
using (auth.uid() = id or has_role(auth.uid(), 'admin'));