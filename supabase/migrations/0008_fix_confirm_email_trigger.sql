-- sync_auth_user_profile updates profiles.email_verified_at whenever Supabase
-- Auth confirms a user's email. That column is protected by
-- protect_profile_security_fields, which only allows service_role or an
-- explicit allow_security_update flag to change it. Auth's own connection is
-- neither, so every email confirmation was aborting with "Error confirming
-- user" (unexpected_failure). Set the same bypass flag the other authorized
-- server operations use.
create or replace function public.sync_auth_user_profile() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform set_config('stitchlink.allow_security_update','on',true);
  update public.profiles set
    email_verified_at=new.email_confirmed_at,
    display_name=case when display_name='' then left(trim(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name','')),100) else display_name end
  where id=new.id;
  return new;
end $$;
