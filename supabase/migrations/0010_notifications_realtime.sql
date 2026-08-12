-- Enable Supabase Realtime for the notifications table so the in-app bell
-- can subscribe to new rows live, the same way messages already does.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
