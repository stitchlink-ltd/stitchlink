-- StitchLink marketplace schema. Run with the Supabase CLI against each environment.
create extension if not exists pgcrypto;

create type public.app_role as enum ('customer','tailor','admin');
create type public.verification_status as enum ('draft','submitted','in_review','approved','rejected','expired');
create type public.request_status as enum ('draft','submitted','negotiating','quoted','accepted','expired','declined','cancelled');
create type public.quote_status as enum ('draft','sent','superseded','accepted','declined','expired');
create type public.order_status as enum ('pending_deposit','active','awaiting_balance','ready','shipped','delivered','disputed','completed','cancelled');
create type public.order_stage as enum ('design','materials','cutting','sewing','fitting','finishing','ready','shipped','delivered');
create type public.payment_status as enum ('pending','successful','failed','refunded','partially_refunded');
create type public.installment_type as enum ('deposit','balance');
create type public.dispute_status as enum ('open','awaiting_customer','awaiting_tailor','in_review','resolved_refund','resolved_partial','resolved_no_refund','closed');
create type public.try_on_status as enum ('pending','processing','completed','failed','expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  display_name text not null default '',
  phone text,
  country_code char(2),
  timezone text not null default 'UTC',
  preferred_currency char(3) not null default 'USD' check (preferred_currency in ('USD','NGN')),
  avatar_path text,
  email_verified_at timestamptz,
  mfa_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tailor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  studio_name text not null,
  bio text not null default '',
  city text not null,
  state text not null,
  country_code char(2) not null default 'NG',
  specialties text[] not null default '{}',
  starting_price_kobo bigint not null default 0 check (starting_price_kobo >= 0),
  turnaround_min_days integer not null default 14 check (turnaround_min_days > 0),
  turnaround_max_days integer not null default 28 check (turnaround_max_days >= turnaround_min_days),
  grade smallint not null default 1 check (grade between 1 and 5),
  grade_override smallint check (grade_override between 1 and 5),
  grade_override_reason text,
  grade_override_expires_at timestamptz,
  active_job_count integer not null default 0 check (active_job_count >= 0),
  completed_job_count integer not null default 0 check (completed_job_count >= 0),
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),
  on_time_rate numeric(5,2) not null default 100 check (on_time_rate between 0 and 100),
  cancellation_rate numeric(5,2) not null default 0 check (cancellation_rate between 0 and 100),
  lost_dispute_rate numeric(5,2) not null default 0 check (lost_dispute_rate between 0 and 100),
  verification_status public.verification_status not null default 'draft',
  published boolean not null default false,
  bank_recipient_code text,
  bank_account_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tailor_applications (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailor_profiles(user_id) on delete cascade,
  status public.verification_status not null default 'draft',
  submitted_at timestamptz,
  assigned_admin_id uuid references public.profiles(id),
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.tailor_applications(id) on delete cascade,
  document_type text not null check (document_type in ('government_id','address_proof','business_document','bank_proof','portfolio_ownership')),
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailor_profiles(user_id) on delete cascade,
  title text not null,
  description text not null default '',
  garment_type text not null,
  image_paths text[] not null check (cardinality(image_paths) between 1 and 8),
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.grade_policies (
  grade smallint primary key check (grade between 1 and 5),
  min_completed_jobs integer not null,
  min_rating numeric(3,2),
  min_on_time_rate numeric(5,2),
  max_cancellation_rate numeric(5,2),
  max_lost_dispute_rate numeric(5,2),
  active_job_capacity integer not null check (active_job_capacity > 0),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.grade_policies values
  (1,0,null,null,null,null,2,null,now()),
  (2,5,4.0,80,15,10,4,null,now()),
  (3,20,4.2,85,10,7,7,null,now()),
  (4,50,4.5,90,7,5,12,null,now()),
  (5,100,4.7,95,5,3,20,null,now());

create table public.grade_history (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailor_profiles(user_id) on delete cascade,
  previous_grade smallint not null,
  new_grade smallint not null,
  reason text not null,
  metrics jsonb not null,
  created_at timestamptz not null default now()
);

create table public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  preferred_tailor_id uuid references public.tailor_profiles(user_id),
  garment_type text not null,
  description text not null,
  has_fabric boolean not null default false,
  needed_by date not null,
  budget_kobo bigint not null check (budget_kobo > 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  measurement_method text not null check (measurement_method in ('profile','call','later')),
  delivery_preference text not null check (delivery_preference in ('shipping','pickup','decide_later')),
  status public.request_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.request_images (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.custom_requests(id) on delete cascade,
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.custom_requests(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id,user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 4000),
  attachment_paths text[] not null default '{}',
  system_message boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.custom_requests(id),
  tailor_id uuid not null references public.tailor_profiles(user_id),
  revision integer not null check (revision > 0),
  tailoring_subtotal_kobo bigint not null check (tailoring_subtotal_kobo > 0),
  delivery_kobo bigint not null default 0 check (delivery_kobo >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  scope text not null,
  due_date date not null,
  deposit_basis_points integer not null default 5000 check (deposit_basis_points = 5000),
  status public.quote_status not null default 'draft',
  expires_at timestamptz not null default (now() + interval '72 hours'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(request_id,revision)
);

create table public.measurement_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  garment_category text not null,
  unit text not null check (unit in ('cm','in')),
  version integer not null default 1,
  values jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id,name,version)
);

create table public.capacity_reservations (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailor_profiles(user_id) on delete cascade,
  quote_id uuid not null unique references public.quotes(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  request_id uuid not null unique references public.custom_requests(id),
  quote_id uuid not null unique references public.quotes(id),
  customer_id uuid not null references public.profiles(id),
  tailor_id uuid not null references public.tailor_profiles(user_id),
  tailoring_subtotal_kobo bigint not null check (tailoring_subtotal_kobo > 0),
  delivery_kobo bigint not null default 0 check (delivery_kobo >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status public.order_status not null default 'pending_deposit',
  stage public.order_stage not null default 'design',
  due_date date not null,
  deposit_paid_at timestamptz,
  balance_paid_at timestamptz,
  delivered_at timestamptz,
  customer_approved_at timestamptz,
  payout_eligible_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.measurement_snapshots (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  profile_id uuid references public.measurement_profiles(id),
  values jsonb not null,
  unit text not null check (unit in ('cm','in')),
  consented_at timestamptz not null,
  consented_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.custom_requests(id),
  order_id uuid references public.orders(id),
  customer_id uuid not null references public.profiles(id),
  tailor_id uuid not null references public.tailor_profiles(user_id),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  meeting_url text check (meeting_url ~ '^https://'),
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','rescheduled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (request_id is not null or order_id is not null)
);

create table public.progress_updates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  tailor_id uuid not null references public.tailor_profiles(user_id),
  stage public.order_stage not null,
  note text not null,
  image_paths text[] not null default '{}',
  customer_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  method text not null check (method in ('shipping','pickup')),
  address jsonb,
  carrier text,
  tracking_reference text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  customer_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  customer_id uuid not null references public.profiles(id),
  reference text not null unique,
  installment public.installment_type not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  provider_fee_kobo bigint not null default 0 check (provider_fee_kobo >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status public.payment_status not null default 'pending',
  provider_transaction_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id,installment)
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  payment_id uuid references public.payments(id),
  payout_id uuid,
  entry_type text not null check (entry_type in ('payment_received','provider_fee','platform_commission','tailor_payable','refund','payout','adjustment')),
  debit_account text not null,
  credit_account text not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  reference text not null,
  metadata jsonb not null default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailor_profiles(user_id),
  order_id uuid not null unique references public.orders(id),
  amount_kobo bigint not null check (amount_kobo >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'eligible' check (status in ('eligible','approved','processing','paid','failed','cancelled')),
  provider_reference text unique,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ledger_entries add constraint ledger_entries_payout_id_fkey foreign key (payout_id) references public.payouts(id);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  payment_id uuid not null references public.payments(id),
  amount_kobo bigint not null check (amount_kobo > 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending','processing','successful','failed')),
  provider_reference text,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id),
  customer_id uuid not null references public.profiles(id),
  tailor_id uuid not null references public.tailor_profiles(user_id),
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 2000),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  order_id uuid not null references public.orders(id),
  opened_by uuid not null references public.profiles(id),
  assigned_admin_id uuid references public.profiles(id),
  reason text not null,
  description text not null,
  status public.dispute_status not null default 'open',
  frozen_amount_kobo bigint not null default 0,
  resolution_notes text,
  refund_amount_kobo bigint,
  response_due_at timestamptz not null default (now() + interval '48 hours'),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  description text not null,
  storage_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.try_on_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  customer_id uuid not null references public.profiles(id),
  provider text not null default 'demo',
  provider_job_id text,
  person_image_path text not null,
  garment_image_path text not null,
  preview_path text,
  status public.try_on_status not null default 'pending',
  consented_at timestamptz not null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

-- Keep the expression index strictly immutable. PostgreSQL marks array_to_string as
-- stable, so specialties use their own native array GIN index instead.
create index tailor_profiles_search_idx on public.tailor_profiles using gin (to_tsvector('english'::regconfig,studio_name || ' ' || bio || ' ' || city));
create index tailor_profiles_specialties_idx on public.tailor_profiles using gin (specialties);
create index orders_customer_idx on public.orders(customer_id,status);
create index orders_tailor_idx on public.orders(tailor_id,status);
create index messages_conversation_idx on public.messages(conversation_id,created_at);
create index notifications_user_idx on public.notifications(user_id,read_at,created_at desc);
create index disputes_status_idx on public.disputes(status,response_due_at);
create index capacity_reservations_active_idx on public.capacity_reservations(tailor_id,expires_at) where consumed_at is null;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['profiles','tailor_profiles','tailor_applications','portfolio_items','custom_requests','measurement_profiles','appointments','orders','deliveries','payments','payouts','refunds','reviews','disputes','try_on_jobs'] loop execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t); end loop; end $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,role,display_name) values(new.id,coalesce((new.raw_user_meta_data->>'role')::public.app_role,'customer'),coalesce(new.raw_user_meta_data->>'display_name','')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.current_role() returns public.app_role language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_role()='admin',false) $$;
create or replace function public.is_order_party(p_order_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.orders where id=p_order_id and (customer_id=auth.uid() or tailor_id=auth.uid())) or public.is_admin() $$;
create or replace function public.is_conversation_member(p_conversation_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.conversation_members where conversation_id=p_conversation_id and user_id=auth.uid()) or public.is_admin() $$;

create or replace function public.reject_ledger_mutation() returns trigger language plpgsql as $$ begin raise exception 'Ledger entries are immutable'; end $$;
create trigger immutable_ledger before update or delete on public.ledger_entries for each row execute function public.reject_ledger_mutation();
create trigger immutable_webhook_events before update or delete on public.webhook_events for each row execute function public.reject_ledger_mutation();

create or replace function public.record_successful_payment(p_reference text,p_amount_kobo bigint,p_provider_fee_kobo bigint,p_paid_at timestamptz,p_event_key text)
returns void language plpgsql security definer set search_path=public as $$
declare v_payment public.payments; v_order public.orders; v_commission bigint; v_tailor_payable bigint;
begin
  select * into v_payment from public.payments where reference=p_reference for update;
  if not found then raise exception 'Unknown payment reference'; end if;
  if v_payment.status='successful' then return; end if;
  if v_payment.amount_kobo<>p_amount_kobo or v_payment.currency<>'NGN' then raise exception 'Payment amount mismatch'; end if;
  update public.payments set status='successful',provider_fee_kobo=p_provider_fee_kobo,paid_at=p_paid_at where id=v_payment.id;
  select * into v_order from public.orders where id=v_payment.order_id for update;
  insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference) values(v_order.id,v_payment.id,'payment_received','paystack_clearing','protected_customer_funds',p_amount_kobo,p_reference);
  if p_provider_fee_kobo>0 then insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference) values(v_order.id,v_payment.id,'provider_fee','tailor_payable','paystack_fees',p_provider_fee_kobo,p_reference||':fee'); end if;
  if v_payment.installment='deposit' then
    update public.orders set deposit_paid_at=p_paid_at,status='active' where id=v_order.id;
    update public.capacity_reservations set consumed_at=now() where quote_id=v_order.quote_id and consumed_at is null;
    update public.tailor_profiles set active_job_count=active_job_count+1 where user_id=v_order.tailor_id;
  else update public.orders set balance_paid_at=p_paid_at,status=case when status='awaiting_balance' then 'ready' else status end where id=v_order.id; end if;
  if v_payment.installment='balance' then
    v_commission=round(v_order.tailoring_subtotal_kobo*0.10);
    v_tailor_payable=v_order.tailoring_subtotal_kobo+v_order.delivery_kobo-v_commission-(select coalesce(sum(provider_fee_kobo),0) from public.payments where order_id=v_order.id and (status='successful' or id=v_payment.id));
    insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference) values(v_order.id,v_payment.id,'platform_commission','protected_customer_funds','platform_revenue',v_commission,p_reference||':commission');
    if v_tailor_payable>0 then insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference) values(v_order.id,v_payment.id,'tailor_payable','protected_customer_funds','tailor_payable:'||v_order.tailor_id,v_tailor_payable,p_reference||':payable'); end if;
  end if;
end $$;

create or replace function public.mark_eligible_payouts() returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  insert into public.payouts(tailor_id,order_id,amount_kobo)
  select o.tailor_id,o.id,greatest(0,o.tailoring_subtotal_kobo+o.delivery_kobo-round(o.tailoring_subtotal_kobo*.10)-coalesce((select sum(provider_fee_kobo) from public.payments p where p.order_id=o.id and p.status='successful'),0)-coalesce((select sum(amount_kobo) from public.refunds r where r.order_id=o.id and r.status='successful'),0))
  from public.orders o where o.status='delivered' and (o.customer_approved_at is not null or o.delivered_at<=now()-interval '72 hours') and not exists(select 1 from public.disputes d where d.order_id=o.id and d.status not in ('closed','resolved_no_refund','resolved_partial','resolved_refund')) and not exists(select 1 from public.payouts x where x.order_id=o.id) on conflict(order_id) do nothing;
  get diagnostics v_count=row_count;
  update public.orders o set payout_eligible_at=now(),status='completed',completed_at=now() where exists(select 1 from public.payouts p where p.order_id=o.id and p.status='eligible') and o.status='delivered';
  return v_count;
end $$;

create or replace function public.recalculate_tailor_grades() returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  with calculated as (
    select t.user_id,t.grade,coalesce(t.grade_override,(
      select p.grade from public.grade_policies p where t.completed_job_count>=p.min_completed_jobs and (p.min_rating is null or t.average_rating>=p.min_rating) and (p.min_on_time_rate is null or t.on_time_rate>=p.min_on_time_rate) and (p.max_cancellation_rate is null or t.cancellation_rate<=p.max_cancellation_rate) and (p.max_lost_dispute_rate is null or t.lost_dispute_rate<=p.max_lost_dispute_rate) order by p.grade desc limit 1
    ))::smallint new_grade from public.tailor_profiles t
  ), changed as (update public.tailor_profiles t set grade=c.new_grade from calculated c where t.user_id=c.user_id and t.grade<>c.new_grade returning t.user_id,c.grade old_grade,c.new_grade)
  insert into public.grade_history(tailor_id,previous_grade,new_grade,reason,metrics) select c.user_id,c.old_grade,c.new_grade,'nightly_recalculation',jsonb_build_object('calculated_at',now()) from changed c;
  get diagnostics v_count=row_count; return v_count;
end $$;

alter table public.profiles enable row level security;
alter table public.tailor_profiles enable row level security;
alter table public.tailor_applications enable row level security;
alter table public.verification_documents enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.grade_policies enable row level security;
alter table public.grade_history enable row level security;
alter table public.custom_requests enable row level security;
alter table public.request_images enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.quotes enable row level security;
alter table public.measurement_profiles enable row level security;
alter table public.capacity_reservations enable row level security;
alter table public.orders enable row level security;
alter table public.measurement_snapshots enable row level security;
alter table public.appointments enable row level security;
alter table public.progress_updates enable row level security;
alter table public.deliveries enable row level security;
alter table public.payments enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.payouts enable row level security;
alter table public.refunds enable row level security;
alter table public.reviews enable row level security;
alter table public.disputes enable row level security;
alter table public.dispute_evidence enable row level security;
alter table public.try_on_jobs enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.audit_events enable row level security;
alter table public.webhook_events enable row level security;

create policy profiles_read on public.profiles for select using(id=auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using(id=auth.uid() or public.is_admin()) with check(id=auth.uid() or public.is_admin());
create policy tailor_profiles_public_read on public.tailor_profiles for select using(published and verification_status='approved' or user_id=auth.uid() or public.is_admin());
create policy tailor_profiles_owner_write on public.tailor_profiles for all using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
create policy applications_owner_read on public.tailor_applications for select using(tailor_id=auth.uid() or public.is_admin());
create policy applications_owner_insert on public.tailor_applications for insert with check(tailor_id=auth.uid());
create policy applications_admin_update on public.tailor_applications for update using(public.is_admin());
create policy documents_private_read on public.verification_documents for select using(public.is_admin() or exists(select 1 from public.tailor_applications a where a.id=application_id and a.tailor_id=auth.uid()));
create policy documents_owner_insert on public.verification_documents for insert with check(exists(select 1 from public.tailor_applications a where a.id=application_id and a.tailor_id=auth.uid()));
create policy portfolio_public_read on public.portfolio_items for select using(published or tailor_id=auth.uid() or public.is_admin());
create policy portfolio_owner_write on public.portfolio_items for all using(tailor_id=auth.uid() or public.is_admin()) with check(tailor_id=auth.uid() or public.is_admin());
create policy grade_policy_read on public.grade_policies for select using(true);
create policy grade_policy_admin_write on public.grade_policies for all using(public.is_admin()) with check(public.is_admin());
create policy grade_history_read on public.grade_history for select using(tailor_id=auth.uid() or public.is_admin());
create policy requests_party_read on public.custom_requests for select using(customer_id=auth.uid() or preferred_tailor_id=auth.uid() or public.is_admin());
create policy requests_customer_insert on public.custom_requests for insert with check(customer_id=auth.uid());
create policy requests_party_update on public.custom_requests for update using(customer_id=auth.uid() or preferred_tailor_id=auth.uid() or public.is_admin());
create policy request_images_party on public.request_images for all using(exists(select 1 from public.custom_requests r where r.id=request_id and (r.customer_id=auth.uid() or r.preferred_tailor_id=auth.uid())) or public.is_admin());
create policy conversations_member_read on public.conversations for select using(public.is_conversation_member(id));
create policy conversation_members_read on public.conversation_members for select using(public.is_conversation_member(conversation_id));
create policy messages_member_read on public.messages for select using(public.is_conversation_member(conversation_id));
create policy messages_member_insert on public.messages for insert with check(sender_id=auth.uid() and public.is_conversation_member(conversation_id));
create policy quotes_party_read on public.quotes for select using(tailor_id=auth.uid() or exists(select 1 from public.custom_requests r where r.id=request_id and r.customer_id=auth.uid()) or public.is_admin());
create policy quotes_tailor_write on public.quotes for insert with check(tailor_id=auth.uid());
create policy measurements_owner on public.measurement_profiles for all using(customer_id=auth.uid() or public.is_admin()) with check(customer_id=auth.uid() or public.is_admin());
create policy orders_party_read on public.orders for select using(customer_id=auth.uid() or tailor_id=auth.uid() or public.is_admin());
create policy measurement_snapshots_party on public.measurement_snapshots for select using(public.is_order_party(order_id));
create policy appointments_party on public.appointments for select using(customer_id=auth.uid() or tailor_id=auth.uid() or public.is_admin());
create policy progress_party_read on public.progress_updates for select using(public.is_order_party(order_id));
create policy progress_tailor_insert on public.progress_updates for insert with check(tailor_id=auth.uid() and public.is_order_party(order_id));
create policy deliveries_party on public.deliveries for select using(public.is_order_party(order_id));
create policy payments_customer_read on public.payments for select using(customer_id=auth.uid() or public.is_order_party(order_id));
create policy payments_customer_insert on public.payments for insert with check(customer_id=auth.uid() and public.is_order_party(order_id));
create policy ledger_party_read on public.ledger_entries for select using(public.is_order_party(order_id));
create policy payouts_tailor_read on public.payouts for select using(tailor_id=auth.uid() or public.is_admin());
create policy refunds_party_read on public.refunds for select using(public.is_order_party(order_id));
create policy reviews_public_read on public.reviews for select using(published or customer_id=auth.uid() or tailor_id=auth.uid() or public.is_admin());
create policy reviews_customer_insert on public.reviews for insert with check(customer_id=auth.uid() and public.is_order_party(order_id));
create policy disputes_party_read on public.disputes for select using(opened_by=auth.uid() or public.is_order_party(order_id));
create policy disputes_party_insert on public.disputes for insert with check(opened_by=auth.uid() and public.is_order_party(order_id));
create policy evidence_party on public.dispute_evidence for select using(exists(select 1 from public.disputes d where d.id=dispute_id and public.is_order_party(d.order_id)));
create policy evidence_party_insert on public.dispute_evidence for insert with check(submitted_by=auth.uid() and exists(select 1 from public.disputes d where d.id=dispute_id and public.is_order_party(d.order_id)));
create policy try_on_customer on public.try_on_jobs for all using(customer_id=auth.uid() or public.is_admin()) with check(customer_id=auth.uid());
create policy notifications_owner on public.notifications for select using(user_id=auth.uid());
create policy notifications_owner_update on public.notifications for update using(user_id=auth.uid());
create policy push_owner on public.push_subscriptions for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy audit_admin_read on public.audit_events for select using(public.is_admin());

-- Private storage buckets. Signed URLs should be short-lived and issued only after RLS checks.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('verification','verification',false,10485760,array['image/jpeg','image/png','image/webp']),
  ('marketplace-private','marketplace-private',false,10485760,array['image/jpeg','image/png','image/webp']),
  ('portfolio','portfolio',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
