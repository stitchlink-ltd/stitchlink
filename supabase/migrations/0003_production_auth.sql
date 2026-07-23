-- Production authentication hardening. Public registration can create only customer or tailor roles.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_role public.app_role;
begin
  v_role := case when new.raw_user_meta_data->>'role' in ('customer','tailor')
    then (new.raw_user_meta_data->>'role')::public.app_role else 'customer'::public.app_role end;
  insert into public.profiles(id,role,display_name,email_verified_at,mfa_required)
  values(
    new.id,
    v_role,
    left(trim(coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name','')),100),
    new.email_confirmed_at,
    false
  ) on conflict(id) do nothing;
  return new;
end $$;

create or replace function public.sync_auth_user_profile() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update public.profiles set
    email_verified_at=new.email_confirmed_at,
    display_name=case when display_name='' then left(trim(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name','')),100) else display_name end
  where id=new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_profile_changed on auth.users;
create trigger on_auth_user_profile_changed after update of email_confirmed_at,raw_user_meta_data on auth.users
for each row execute function public.sync_auth_user_profile();

create or replace function public.protect_profile_security_fields() returns trigger
language plpgsql set search_path=public as $$
begin
  if (old.role is distinct from new.role or old.email_verified_at is distinct from new.email_verified_at or old.mfa_required is distinct from new.mfa_required)
     and coalesce(auth.role(),'') <> 'service_role'
     and coalesce(current_setting('stitchlink.allow_security_update',true),'off') <> 'on' then
    raise exception 'Protected profile fields can only be changed by an authorized server operation';
  end if;
  if new.role='admin' then new.mfa_required := true; end if;
  return new;
end $$;

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields before update on public.profiles
for each row execute function public.protect_profile_security_fields();

create or replace function public.set_initial_oauth_role(p_role text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if p_role not in ('customer','tailor') then raise exception 'Invalid public role'; end if;
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform set_config('stitchlink.allow_security_update','on',true);
  update public.profiles
    set role=p_role::public.app_role
    where id=auth.uid() and created_at >= now()-interval '10 minutes' and role in ('customer','tailor');
end $$;
revoke all on function public.set_initial_oauth_role(text) from public;
grant execute on function public.set_initial_oauth_role(text) to authenticated;

-- Admin privileges require both the private database role and a verified MFA session.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce(public.current_role()='admin' and auth.jwt()->>'aal'='aal2',false)
$$;

drop policy if exists tailor_profiles_owner_write on public.tailor_profiles;
create policy tailor_profiles_owner_write on public.tailor_profiles for all
using((user_id=auth.uid() and public.current_role()='tailor') or public.is_admin())
with check((user_id=auth.uid() and public.current_role()='tailor') or public.is_admin());
