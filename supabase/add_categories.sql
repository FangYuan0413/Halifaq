-- Adds Music, Sports, Tech, and Politics categories.
-- Safe to re-run — duplicates are skipped.

insert into public.categories (name, slug) values
  ('Music', 'music'),
  ('Sports', 'sports'),
  ('Tech', 'tech'),
  ('Politics', 'politics')
on conflict (slug) do nothing;
