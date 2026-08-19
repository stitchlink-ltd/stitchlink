-- Admin screens were resolving emails by calling admin.auth.admin.getUserById() once
-- per row (N+1 against Supabase's admin API — falls over once user counts grow).
-- Mirror email onto profiles via the existing auth.users sync triggers instead, so
-- admin queries can select it directly like any other profile column.
alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_role public.app_role;
begin
  v_role := case when new.raw_user_meta_data->>'role' in ('customer','tailor')
    then (new.raw_user_meta_data->>'role')::public.app_role else 'customer'::public.app_role end;
  insert into public.profiles(id,role,display_name,email,email_verified_at,mfa_required)
  values(
    new.id,
    v_role,
    left(trim(coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name','')),100),
    new.email,
    new.email_confirmed_at,
    false
  ) on conflict(id) do nothing;
  return new;
end $$;

-- Carries forward the stitchlink.allow_security_update bypass from 0008 (auth's own
-- connection is neither service_role nor the row owner, so without it every email
-- confirmation aborts with "Error confirming user").
create or replace function public.sync_auth_user_profile() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform set_config('stitchlink.allow_security_update','on',true);
  update public.profiles set
    email=new.email,
    email_verified_at=new.email_confirmed_at,
    display_name=case when display_name='' then left(trim(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name','')),100) else display_name end
  where id=new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_profile_changed on auth.users;
create trigger on_auth_user_profile_changed after update of email,email_confirmed_at,raw_user_meta_data on auth.users
for each row execute function public.sync_auth_user_profile();

-- Admin screens now trust profiles.email for identity display, so guard it exactly
-- like the other security-sensitive fields: only the sync trigger above (or an
-- explicit service-role operation) may change it, never a user's own client call.
create or replace function public.protect_profile_security_fields() returns trigger
language plpgsql set search_path=public as $$
begin
  if (old.role is distinct from new.role or old.email_verified_at is distinct from new.email_verified_at or old.mfa_required is distinct from new.mfa_required or old.email is distinct from new.email)
     and coalesce(auth.role(),'') <> 'service_role'
     and coalesce(current_setting('stitchlink.allow_security_update',true),'off') <> 'on' then
    raise exception 'Protected profile fields can only be changed by an authorized server operation';
  end if;
  if new.role='admin' then new.mfa_required := true; end if;
  return new;
end $$;

update public.profiles p set email=u.email from auth.users u where u.id=p.id and p.email is distinct from u.email;
