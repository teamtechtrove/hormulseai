
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

drop policy if exists "Public read uploads" on storage.objects;

create policy "Owner or admin list uploads"
  on storage.objects for select
  using (
    bucket_id = 'uploads'
    and (
      (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
      or public.has_role(auth.uid(),'admin')
    )
  );
