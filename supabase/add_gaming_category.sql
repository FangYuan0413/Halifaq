-- Adds a Gaming category.
-- Safe to re-run — duplicates are skipped.

insert into public.categories (name, slug) values
  ('Gaming', 'gaming')
on conflict (slug) do nothing;
