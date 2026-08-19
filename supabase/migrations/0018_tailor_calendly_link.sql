alter table public.tailor_profiles
  add column calendly_url text check (calendly_url ~ '^https://');
