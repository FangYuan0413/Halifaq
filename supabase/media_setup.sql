-- Adds photo/video support to posts.
-- Legacy bootstrap script. New schema changes should go in supabase/migrations/.

alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists media_type text;

-- Post media is intentionally public because posts are public.
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can view post media" on storage.objects;
create policy "Public can view post media" on storage.objects
  for select using (bucket_id = 'post-media');

-- Uploads must be placed under <auth.uid()>/..., matching the app's paths.
drop policy if exists "Signed-in users can upload post media" on storage.objects;
drop policy if exists "Users can upload their own post media" on storage.objects;
create policy "Users can upload their own post media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own post media" on storage.objects;
create policy "Users can delete their own post media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
