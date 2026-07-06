-- Adds a view counter to categories, bumped once each time someone opens
-- that category's dedicated /category/[slug] page. Safe to re-run.

alter table public.categories add column if not exists views int not null default 0;

-- Runs as the function owner (bypasses the usual "only the author can update"
-- rule) so any signed-in visitor opening a category page can bump its count.
create or replace function public.increment_category_views(category_id int)
returns void as $$
begin
  update public.categories set views = views + 1 where id = category_id;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_category_views(int) to authenticated;
