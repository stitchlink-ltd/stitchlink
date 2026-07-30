do $$ begin
  create type public.account_status as enum ('active','suspended');
exception when duplicate_object then null;
end $$;

alter table public.profiles add column if not exists account_status public.account_status not null default 'active';
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspended_reason text;
alter table public.payments add column if not exists authorization_url text;
alter table public.payments add column if not exists initialization_error text;
alter table public.payments add column if not exists initialized_at timestamptz;

alter table public.payments drop constraint if exists payments_order_id_installment_key;
create unique index if not exists payments_active_installment_idx on public.payments(order_id,installment) where status in ('pending','successful');

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('email','in_app')),
  recipient text,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  provider_reference text,
  failure_reason text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_deliveries_status_idx on public.notification_deliveries(status,created_at);

create or replace function public.is_active_account(p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce((select account_status='active' from public.profiles where id=p_user_id),false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce(public.current_role()='admin' and public.is_active_account() and auth.jwt()->>'aal'='aal2',false)
$$;

create or replace function public.require_admin_mfa() returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Administrator MFA is required'; end if;
end $$;

create or replace function public.audit_change(p_action text,p_entity_type text,p_entity_id uuid,p_before jsonb default null,p_after jsonb default null) returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_events(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),p_action,p_entity_type,p_entity_id,p_before,p_after);
end $$;

create or replace function public.notify_user(p_user_id uuid,p_type text,p_title text,p_body text,p_href text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_notification_id uuid;
begin
  insert into public.notifications(user_id,type,title,body,href) values(p_user_id,p_type,p_title,p_body,p_href) returning id into v_notification_id;
  insert into public.notification_deliveries(notification_id,channel,status) values(v_notification_id,'in_app','sent');
  return v_notification_id;
end $$;

create or replace function public.submit_request(
  p_tailor_id uuid,
  p_garment_type text,
  p_description text,
  p_has_fabric boolean,
  p_needed_by date,
  p_budget_kobo bigint,
  p_measurement_method text,
  p_delivery_preference text,
  p_images jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_request_id uuid; v_image jsonb; v_conversation_id uuid;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Authentication required'; end if;
  if p_tailor_id is null or not exists(select 1 from public.tailor_profiles where user_id=p_tailor_id and published and verification_status='approved') then raise exception 'Choose a verified tailor'; end if;
  if char_length(trim(p_garment_type))<2 or char_length(trim(p_description))<10 or p_budget_kobo<=0 or p_needed_by<current_date then raise exception 'Invalid request'; end if;
  if p_measurement_method not in ('profile','call','later') or p_delivery_preference not in ('shipping','pickup','decide_later') then raise exception 'Invalid request options'; end if;
  if jsonb_array_length(p_images)>5 then raise exception 'A request may include at most five images'; end if;
  insert into public.custom_requests(customer_id,preferred_tailor_id,garment_type,description,has_fabric,needed_by,budget_kobo,measurement_method,delivery_preference,status)
  values(auth.uid(),p_tailor_id,trim(p_garment_type),trim(p_description),coalesce(p_has_fabric,false),p_needed_by,p_budget_kobo,p_measurement_method,p_delivery_preference,'submitted') returning id into v_request_id;
  for v_image in select value from jsonb_array_elements(p_images) loop
    if coalesce(v_image->>'path','') !~ ('^' || auth.uid()::text || '/request/[0-9a-f-]+\\.(jpg|png|webp)$') then raise exception 'Invalid request image'; end if;
    insert into public.request_images(request_id,storage_path,mime_type,size_bytes)
    values(v_request_id,v_image->>'path',v_image->>'mimeType',(v_image->>'sizeBytes')::integer);
  end loop;
  insert into public.conversations(request_id) values(v_request_id) returning id into v_conversation_id;
  insert into public.conversation_members(conversation_id,user_id) values(v_conversation_id,auth.uid()),(v_conversation_id,p_tailor_id);
  perform public.notify_user(p_tailor_id,'request.submitted','New custom request',trim(p_garment_type)||' request awaiting your quote','/tailor/quotes');
  perform public.audit_change('request.submitted','custom_request',v_request_id,null,jsonb_build_object('tailor_id',p_tailor_id));
  return v_request_id;
end $$;

create or replace function public.send_quote(p_request_id uuid,p_tailoring_kobo bigint,p_delivery_kobo bigint,p_scope text,p_due_date date,p_expires_at timestamptz default now()+interval '72 hours') returns uuid
language plpgsql security definer set search_path=public as $$
declare v_request public.custom_requests; v_quote_id uuid; v_revision integer;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Authentication required'; end if;
  select * into v_request from public.custom_requests where id=p_request_id and preferred_tailor_id=auth.uid() for update;
  if not found then raise exception 'Request is unavailable'; end if;
  if v_request.status not in ('submitted','negotiating','quoted') then raise exception 'Request cannot be quoted'; end if;
  if p_tailoring_kobo<=0 or p_delivery_kobo<0 or char_length(trim(p_scope))<10 or p_due_date<current_date or p_expires_at<=now() then raise exception 'Invalid quote'; end if;
  select coalesce(max(revision),0)+1 into v_revision from public.quotes where request_id=p_request_id;
  update public.quotes set status='superseded' where request_id=p_request_id and status='sent';
  insert into public.quotes(request_id,tailor_id,revision,tailoring_subtotal_kobo,delivery_kobo,scope,due_date,status,expires_at)
  values(p_request_id,auth.uid(),v_revision,p_tailoring_kobo,p_delivery_kobo,trim(p_scope),p_due_date,'sent',p_expires_at) returning id into v_quote_id;
  update public.custom_requests set status='quoted' where id=p_request_id;
  perform public.notify_user(v_request.customer_id,'quote.sent','Your tailor sent a quote','Review the latest structured quote before it expires.','/customer/orders');
  perform public.audit_change('quote.sent','quote',v_quote_id,null,jsonb_build_object('request_id',p_request_id,'revision',v_revision));
  return v_quote_id;
end $$;

create or replace function public.add_progress_update(p_order_id uuid,p_stage public.order_stage,p_note text,p_image_paths text[] default '{}') returns uuid
language plpgsql security definer set search_path=public as $$
declare v_order public.orders; v_update_id uuid;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Authentication required'; end if;
  select * into v_order from public.orders where id=p_order_id and tailor_id=auth.uid() for update;
  if not found or v_order.status not in ('active','awaiting_balance','ready') then raise exception 'Order cannot be updated'; end if;
  if char_length(trim(p_note))<3 or cardinality(p_image_paths)>5 then raise exception 'Invalid progress update'; end if;
  insert into public.progress_updates(order_id,tailor_id,stage,note,image_paths) values(p_order_id,auth.uid(),p_stage,trim(p_note),coalesce(p_image_paths,'{}')) returning id into v_update_id;
  update public.orders set stage=p_stage,status=case when p_stage='ready' and status='active' then 'awaiting_balance' else status end where id=p_order_id;
  perform public.notify_user(v_order.customer_id,'order.progress','Your order has a new update',trim(p_note),'/customer/orders/'||p_order_id);
  perform public.audit_change('order.progress_updated','order',p_order_id,null,jsonb_build_object('stage',p_stage,'update_id',v_update_id));
  return v_update_id;
end $$;

create or replace function public.record_shipment(p_order_id uuid,p_method text,p_carrier text,p_tracking_reference text) returns void
language plpgsql security definer set search_path=public as $$
declare v_order public.orders;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Authentication required'; end if;
  select * into v_order from public.orders where id=p_order_id and tailor_id=auth.uid() for update;
  if not found or v_order.status not in ('ready','awaiting_balance') or v_order.balance_paid_at is null then raise exception 'The balance must be paid before shipment'; end if;
  if p_method not in ('shipping','pickup') then raise exception 'Invalid delivery method'; end if;
  insert into public.deliveries(order_id,method,carrier,tracking_reference,shipped_at) values(p_order_id,p_method,nullif(trim(p_carrier),''),nullif(trim(p_tracking_reference),''),now())
  on conflict(order_id) do update set method=excluded.method,carrier=excluded.carrier,tracking_reference=excluded.tracking_reference,shipped_at=excluded.shipped_at;
  update public.orders set status='shipped',stage='shipped' where id=p_order_id;
  perform public.notify_user(v_order.customer_id,'order.shipped','Your order is on its way',coalesce(nullif(trim(p_tracking_reference),''),'Your tailor marked this order as shipped.'),'/customer/orders/'||p_order_id);
  perform public.audit_change('order.shipped','order',p_order_id,null,jsonb_build_object('carrier',p_carrier,'tracking_reference',p_tracking_reference));
end $$;

create or replace function public.confirm_delivery(p_order_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v_order public.orders;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Authentication required'; end if;
  select * into v_order from public.orders where id=p_order_id and customer_id=auth.uid() for update;
  if not found or v_order.status<>'shipped' then raise exception 'Order is not ready for delivery confirmation'; end if;
  update public.deliveries set delivered_at=now(),customer_confirmed_at=now() where order_id=p_order_id;
  update public.orders set status='delivered',stage='delivered',delivered_at=now(),customer_approved_at=now() where id=p_order_id;
  perform public.notify_user(v_order.tailor_id,'order.delivered','Customer confirmed delivery','Your payout will become eligible after marketplace review.','/tailor/earnings');
  perform public.audit_change('order.delivery_confirmed','order',p_order_id,null,jsonb_build_object('customer_id',auth.uid()));
end $$;

create or replace function public.open_customer_dispute(p_order_id uuid,p_reason text,p_description text,p_evidence_paths text[] default '{}') returns uuid
language plpgsql security definer set search_path=public as $$
declare v_order public.orders; v_dispute_id uuid; v_frozen bigint;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Authentication required'; end if;
  select * into v_order from public.orders where id=p_order_id and customer_id=auth.uid() for update;
  if not found or v_order.status not in ('shipped','delivered','completed') then raise exception 'This order cannot be disputed'; end if;
  if exists(select 1 from public.disputes where order_id=p_order_id and status not in ('closed','resolved_no_refund','resolved_partial','resolved_refund')) then raise exception 'An active dispute already exists'; end if;
  if char_length(trim(p_reason))<3 or char_length(trim(p_description))<10 or cardinality(p_evidence_paths)>5 then raise exception 'Invalid dispute'; end if;
  select coalesce(sum(amount_kobo),0) into v_frozen from public.payments where order_id=p_order_id and status='successful';
  insert into public.disputes(reference,order_id,opened_by,reason,description,frozen_amount_kobo,status)
  values('DSP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),p_order_id,auth.uid(),trim(p_reason),trim(p_description),v_frozen,'open') returning id into v_dispute_id;
  insert into public.dispute_evidence(dispute_id,submitted_by,description,storage_paths) values(v_dispute_id,auth.uid(),'Customer evidence',coalesce(p_evidence_paths,'{}'));
  update public.orders set status='disputed' where id=p_order_id;
  perform public.notify_user(v_order.tailor_id,'dispute.opened','A customer opened a dispute','Marketplace staff will review the case before any payout is released.','/tailor/jobs');
  perform public.audit_change('dispute.opened','dispute',v_dispute_id,null,jsonb_build_object('order_id',p_order_id));
  return v_dispute_id;
end $$;

create or replace function public.admin_review_application(p_application_id uuid,p_approved boolean,p_reason text default '') returns void
language plpgsql security definer set search_path=public as $$
declare v_application public.tailor_applications;
begin
  perform public.require_admin_mfa();
  select * into v_application from public.tailor_applications where id=p_application_id for update;
  if not found then raise exception 'Application not found'; end if;
  update public.tailor_applications set status=case when p_approved then 'approved' else 'rejected' end,assigned_admin_id=auth.uid(),decision_reason=nullif(trim(p_reason),''),decided_at=now() where id=p_application_id;
  update public.tailor_profiles set verification_status=case when p_approved then 'approved' else 'rejected' end,published=p_approved where user_id=v_application.tailor_id;
  perform public.notify_user(v_application.tailor_id,'verification.reviewed',case when p_approved then 'Your atelier is verified' else 'Your verification needs attention' end,coalesce(nullif(trim(p_reason),''),case when p_approved then 'Your profile is now visible to customers.' else 'Review the decision notes and contact support.' end),'/tailor/verification');
  perform public.audit_change('verification.reviewed','tailor_application',p_application_id,null,jsonb_build_object('approved',p_approved));
end $$;

create or replace function public.admin_change_profile(p_user_id uuid,p_role public.app_role,p_account_status public.account_status default 'active',p_reason text default '') returns void
language plpgsql security definer set search_path=public as $$
declare v_before jsonb;
begin
  perform public.require_admin_mfa();
  perform set_config('stitchlink.allow_security_update','on',true);
  select jsonb_build_object('role',role,'account_status',account_status) into v_before from public.profiles where id=p_user_id for update;
  if v_before is null then raise exception 'Profile not found'; end if;
  update public.profiles set role=p_role,account_status=p_account_status,mfa_required=(p_role='admin'),suspended_at=case when p_account_status='suspended' then now() else null end,suspended_reason=case when p_account_status='suspended' then nullif(trim(p_reason),'') else null end where id=p_user_id;
  if p_role='tailor' and not exists(select 1 from public.tailor_profiles where user_id=p_user_id) then raise exception 'Create the tailor profile before assigning the tailor role'; end if;
  perform public.audit_change('profile.admin_updated','profile',p_user_id,v_before,jsonb_build_object('role',p_role,'account_status',p_account_status,'reason',p_reason));
end $$;

create or replace function public.admin_resolve_dispute(p_dispute_id uuid,p_status public.dispute_status,p_notes text,p_refund_kobo bigint default 0) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_dispute public.disputes; v_payment_id uuid; v_refund_id uuid;
begin
  perform public.require_admin_mfa();
  if p_status not in ('resolved_refund','resolved_partial','resolved_no_refund','closed') or char_length(trim(p_notes))<3 or p_refund_kobo<0 then raise exception 'Invalid dispute resolution'; end if;
  select * into v_dispute from public.disputes where id=p_dispute_id for update;
  if not found then raise exception 'Dispute not found'; end if;
  if p_refund_kobo>0 then
    select id into v_payment_id from public.payments where order_id=v_dispute.order_id and status='successful' order by paid_at desc limit 1;
    if v_payment_id is null then raise exception 'No successful payment is available to refund'; end if;
    insert into public.refunds(order_id,payment_id,amount_kobo,reason,status,approved_by) values(v_dispute.order_id,v_payment_id,p_refund_kobo,trim(p_notes),'pending',auth.uid()) returning id into v_refund_id;
  end if;
  update public.disputes set status=p_status,resolution_notes=trim(p_notes),refund_amount_kobo=nullif(p_refund_kobo,0),assigned_admin_id=auth.uid(),resolved_at=now() where id=p_dispute_id;
  perform public.audit_change('dispute.resolved','dispute',p_dispute_id,null,jsonb_build_object('status',p_status,'refund_kobo',p_refund_kobo));
  return v_refund_id;
end $$;

create or replace function public.admin_record_refund(p_refund_id uuid,p_provider_reference text) returns void
language plpgsql security definer set search_path=public as $$
declare v_refund public.refunds;
begin
  perform public.require_admin_mfa();
  select * into v_refund from public.refunds where id=p_refund_id for update;
  if not found or v_refund.status not in ('pending','processing') then raise exception 'Refund is unavailable'; end if;
  update public.refunds set status='successful',provider_reference=nullif(trim(p_provider_reference),'') where id=p_refund_id;
  insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference,created_by) values(v_refund.order_id,v_refund.payment_id,'refund','protected_customer_funds','paystack_clearing',v_refund.amount_kobo,coalesce(nullif(trim(p_provider_reference),''),'refund:'||p_refund_id),auth.uid());
  perform public.audit_change('refund.recorded','refund',p_refund_id,null,jsonb_build_object('provider_reference',p_provider_reference));
end $$;

create or replace function public.admin_record_payout(p_payout_id uuid,p_provider_reference text) returns void
language plpgsql security definer set search_path=public as $$
declare v_payout public.payouts;
begin
  perform public.require_admin_mfa();
  select * into v_payout from public.payouts where id=p_payout_id for update;
  if not found or v_payout.status not in ('eligible','approved','processing') then raise exception 'Payout is unavailable'; end if;
  update public.payouts set status='paid',provider_reference=nullif(trim(p_provider_reference),''),approved_by=auth.uid(),approved_at=coalesce(approved_at,now()),paid_at=now() where id=p_payout_id;
  if v_payout.amount_kobo>0 then insert into public.ledger_entries(order_id,payout_id,entry_type,debit_account,credit_account,amount_kobo,reference,created_by) values(v_payout.order_id,p_payout_id,'payout','tailor_payable:'||v_payout.tailor_id,'external_payout',v_payout.amount_kobo,coalesce(nullif(trim(p_provider_reference),''),'payout:'||p_payout_id),auth.uid()); end if;
  perform public.audit_change('payout.recorded','payout',p_payout_id,null,jsonb_build_object('provider_reference',p_provider_reference));
end $$;

create or replace function public.admin_update_grade_policy(p_grade smallint,p_min_completed_jobs integer,p_min_rating numeric,p_min_on_time_rate numeric,p_max_cancellation_rate numeric,p_max_lost_dispute_rate numeric,p_capacity integer) returns void
language plpgsql security definer set search_path=public as $$
begin
  perform public.require_admin_mfa();
  if p_grade not between 1 and 5 or p_min_completed_jobs<0 or p_capacity<1 then raise exception 'Invalid grade policy'; end if;
  update public.grade_policies set min_completed_jobs=p_min_completed_jobs,min_rating=p_min_rating,min_on_time_rate=p_min_on_time_rate,max_cancellation_rate=p_max_cancellation_rate,max_lost_dispute_rate=p_max_lost_dispute_rate,active_job_capacity=p_capacity,updated_by=auth.uid(),updated_at=now() where grade=p_grade;
  perform public.audit_change('grade_policy.updated','grade_policy',null,null,jsonb_build_object('grade',p_grade));
end $$;

create or replace function public.admin_reserve_balance_payment(p_order_id uuid,p_reference text) returns bigint
language plpgsql security definer set search_path=public as $$
declare v_order public.orders; v_amount bigint;
begin
  perform public.require_admin_mfa();
  select * into v_order from public.orders where id=p_order_id for update;
  if not found or v_order.status<>'awaiting_balance' or v_order.deposit_paid_at is null or v_order.balance_paid_at is not null then raise exception 'Balance is not payable'; end if;
  update public.payments set status='failed',initialization_error='Replaced by a new staff-issued balance link' where order_id=p_order_id and installment='balance' and status='pending';
  v_amount=(v_order.tailoring_subtotal_kobo+v_order.delivery_kobo)/2+mod(v_order.tailoring_subtotal_kobo+v_order.delivery_kobo,2);
  insert into public.payments(order_id,customer_id,reference,installment,amount_kobo,currency,status) values(p_order_id,v_order.customer_id,p_reference,'balance',v_amount,'NGN','pending');
  perform public.audit_change('payment.balance_link_created','order',p_order_id,null,jsonb_build_object('reference',p_reference));
  return v_amount;
end $$;

create or replace function public.record_successful_payment(p_reference text,p_amount_kobo bigint,p_provider_fee_kobo bigint,p_paid_at timestamptz,p_event_key text)
returns void language plpgsql security definer set search_path=public as $$
declare v_payment public.payments; v_order public.orders; v_commission bigint; v_tailor_payable bigint;
begin
  select * into v_payment from public.payments where reference=p_reference for update;
  if not found then raise exception 'Unknown payment reference'; end if;
  if v_payment.status='successful' then return; end if;
  if v_payment.status='failed' then raise exception 'Payment attempt is no longer active'; end if;
  if v_payment.amount_kobo<>p_amount_kobo or v_payment.currency<>'NGN' then raise exception 'Payment amount mismatch'; end if;
  update public.payments set status='successful',provider_fee_kobo=p_provider_fee_kobo,paid_at=p_paid_at where id=v_payment.id;
  select * into v_order from public.orders where id=v_payment.order_id for update;
  insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference) values(v_order.id,v_payment.id,'payment_received','paystack_clearing','protected_customer_funds',p_amount_kobo,p_reference);
  if p_provider_fee_kobo>0 then insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference) values(v_order.id,v_payment.id,'provider_fee','tailor_payable','paystack_fees',p_provider_fee_kobo,p_reference||':fee'); end if;
  if v_payment.installment='deposit' then
    update public.orders set deposit_paid_at=p_paid_at,status='active' where id=v_order.id;
    update public.capacity_reservations set consumed_at=now() where quote_id=v_order.quote_id and consumed_at is null;
    update public.tailor_profiles set active_job_count=active_job_count+1 where user_id=v_order.tailor_id;
  else update public.orders set balance_paid_at=p_paid_at,status='ready' where id=v_order.id; end if;
  if v_payment.installment='balance' then
    v_commission=round(v_order.tailoring_subtotal_kobo*0.10);
    v_tailor_payable=v_order.tailoring_subtotal_kobo+v_order.delivery_kobo-v_commission-(select coalesce(sum(provider_fee_kobo),0) from public.payments where order_id=v_order.id and status='successful');
    insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference) values(v_order.id,v_payment.id,'platform_commission','protected_customer_funds','platform_revenue',v_commission,p_reference||':commission');
    if v_tailor_payable>0 then insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference) values(v_order.id,v_payment.id,'tailor_payable','protected_customer_funds','tailor_payable:'||v_order.tailor_id,v_tailor_payable,p_reference||':payable'); end if;
  end if;
  perform public.notify_user(v_order.customer_id,'payment.successful','Payment confirmed','Your payment has been recorded in exact NGN.','/customer/payments');
end $$;

alter table public.notification_deliveries enable row level security;
create policy notification_deliveries_owner_read on public.notification_deliveries for select using(exists(select 1 from public.notifications n where n.id=notification_id and n.user_id=auth.uid()) or public.is_admin());

create policy marketplace_private_upload on storage.objects for insert to authenticated with check(bucket_id='marketplace-private' and (storage.foldername(name))[1]=auth.uid()::text);
create policy verification_upload on storage.objects for insert to authenticated with check(bucket_id='verification' and (storage.foldername(name))[1]=auth.uid()::text);
create policy portfolio_upload on storage.objects for insert to authenticated with check(bucket_id='portfolio' and (storage.foldername(name))[1]=auth.uid()::text);

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then alter publication supabase_realtime add table public.messages; end if;
end $$;

revoke all on function public.require_admin_mfa() from public,anon,authenticated;
revoke all on function public.audit_change(text,text,uuid,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.notify_user(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_request(uuid,text,text,boolean,date,bigint,text,text,jsonb) to authenticated;
grant execute on function public.send_quote(uuid,bigint,bigint,text,date,timestamptz) to authenticated;
grant execute on function public.add_progress_update(uuid,public.order_stage,text,text[]) to authenticated;
grant execute on function public.record_shipment(uuid,text,text,text) to authenticated;
grant execute on function public.confirm_delivery(uuid) to authenticated;
grant execute on function public.open_customer_dispute(uuid,text,text,text[]) to authenticated;
grant execute on function public.admin_review_application(uuid,boolean,text) to authenticated;
grant execute on function public.admin_change_profile(uuid,public.app_role,public.account_status,text) to authenticated;
grant execute on function public.admin_resolve_dispute(uuid,public.dispute_status,text,bigint) to authenticated;
grant execute on function public.admin_record_refund(uuid,text) to authenticated;
grant execute on function public.admin_record_payout(uuid,text) to authenticated;
grant execute on function public.admin_update_grade_policy(smallint,integer,numeric,numeric,numeric,numeric,integer) to authenticated;
grant execute on function public.admin_reserve_balance_payment(uuid,text) to authenticated;
