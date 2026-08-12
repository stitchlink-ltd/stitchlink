-- Google Calendar OAuth token storage. Service-role only: no RLS policies are
-- granted, client code reads connection state via the RPCs below instead of
-- selecting the table directly, so access_token/refresh_token never cross PostgREST.

create table if not exists public.google_calendar_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text not null,
  google_email text,
  sync_milestones boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.google_calendar_tokens enable row level security;
revoke all on public.google_calendar_tokens from anon, authenticated;

create trigger set_google_calendar_tokens_updated_at before update on public.google_calendar_tokens
  for each row execute function public.set_updated_at();

create or replace function public.google_calendar_connection_status() returns table(connected boolean,google_email text,sync_milestones boolean)
language sql stable security definer set search_path=public as $$
  select true,t.google_email,t.sync_milestones from public.google_calendar_tokens t where t.user_id=auth.uid()
  union all
  select false,null,false where not exists(select 1 from public.google_calendar_tokens where user_id=auth.uid())
  limit 1
$$;
grant execute on function public.google_calendar_connection_status() to authenticated;

create or replace function public.set_calendar_milestone_sync(p_enabled boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
  update public.google_calendar_tokens set sync_milestones=p_enabled where user_id=auth.uid();
  if not found then raise exception 'Connect Google Calendar first'; end if;
end $$;
grant execute on function public.set_calendar_milestone_sync(boolean) to authenticated;
