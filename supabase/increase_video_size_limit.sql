-- Raises the post-media storage bucket's max file size to 500MB so a
-- 30-minute video (the new client-side length cap in app/feed/page.tsx)
-- isn't rejected by Supabase Storage itself before it even reaches the
-- client-side checks. Safe to re-run.
update storage.buckets
set file_size_limit = 524288000  -- 500 * 1024 * 1024 bytes
where id = 'post-media';
