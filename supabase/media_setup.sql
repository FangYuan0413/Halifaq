-- Adds photo/video support to posts.
-- Run this once in the Supabase SQL Editor (safe to re-run).

-- 1. Add media columns to posts (media_type is 'image' or 'video')
alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists media_type text;

-- 2. Create a public storage bucket for post media
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- 3. Storage policies: anyone can view files, only signed-in users can upload
drop policy if exists "Public can view post media" on storage.objects;
create policy "Public can view post media" on storage.objects
  for select using (bucket_id = 'post-media');

drop policy if exists "Signed-in users can upload post media" on storage.objects;
create policy "Signed-in users can upload post media" on storage.objects
  for insert with check (bucket_id = 'post-media' and auth.role() = 'authenticated');

drop policy if exists "Users can delete their own post media" on storage.objects;
create policy "Users can delete their own post media" on storage.objects
  for delete using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);
