-- Repair accounts created before the marketplace profile trigger was installed.
-- Public auth metadata may select only customer or tailor; it can never provision an administrator.
insert into public.profiles (
  id,
  role,
  display_name,
  email_verified_at,
  mfa_required
)
select
  users.id,
  case
    when users.raw_user_meta_data->>'role' in ('customer','tailor')
      then (users.raw_user_meta_data->>'role')::public.app_role
    else 'customer'::public.app_role
  end,
  left(
    trim(
      coalesce(
        users.raw_user_meta_data->>'display_name',
        users.raw_user_meta_data->>'full_name',
        users.raw_user_meta_data->>'name',
        ''
      )
    ),
    100
  ),
  users.email_confirmed_at,
  false
from auth.users as users
on conflict (id) do nothing;
