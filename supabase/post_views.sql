-- Adds a view counter to posts, used to rank "popular searches" by real traffic.
-- Safe to re-run.

alter table public.posts add column if not exists views int not null default 0;

-- Runs as the function owner (bypasses the usual "only the author can update"
-- rule) so any signed-in visitor opening a post can bump its view count.
create or replace function public.increment_post_views(post_id uuid)
returns void as $$
begin
  update public.posts set views = views + 1 where id = post_id;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_post_views(uuid) to authenticated;
