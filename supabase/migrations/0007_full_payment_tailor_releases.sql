-- Customers pay once at checkout. Tailors receive their net payable in two
-- releases: one half after payment and the remainder after delivery confirmation.
alter table public.orders alter column status set default 'pending_payment';
alter table public.orders add column if not exists initial_payout_eligible_at timestamptz;

alter table public.payouts add column if not exists release_phase text not null default 'final'
  check (release_phase in ('initial','final'));
alter table public.payouts drop constraint if exists payouts_order_id_key;
alter table public.payouts add constraint payouts_order_release_phase_key unique(order_id,release_phase);
create index if not exists payouts_release_phase_idx on public.payouts(order_id,release_phase,status);

create or replace function public.add_progress_update(p_order_id uuid,p_stage public.order_stage,p_note text,p_image_paths text[] default '{}') returns uuid
language plpgsql security definer set search_path=public as $$
declare v_order public.orders; v_update_id uuid;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Authentication required'; end if;
  select * into v_order from public.orders where id=p_order_id and tailor_id=auth.uid() for update;
  if not found or v_order.status not in ('active','awaiting_balance','ready') then raise exception 'Order cannot be updated'; end if;
  if char_length(trim(p_note))<3 or cardinality(p_image_paths)>5 then raise exception 'Invalid progress update'; end if;
  insert into public.progress_updates(order_id,tailor_id,stage,note,image_paths)
  values(p_order_id,auth.uid(),p_stage,trim(p_note),coalesce(p_image_paths,'{}')) returning id into v_update_id;
  update public.orders
  set stage=p_stage,
      status=case when p_stage='ready' and status='active' and balance_paid_at is null then 'awaiting_balance' else status end
  where id=p_order_id;
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
  if not found or v_order.status not in ('active','ready','awaiting_balance') or v_order.balance_paid_at is null then raise exception 'Full payment is required before shipment'; end if;
  if p_method not in ('shipping','pickup') then raise exception 'Invalid delivery method'; end if;
  insert into public.deliveries(order_id,method,carrier,tracking_reference,shipped_at)
  values(p_order_id,p_method,nullif(trim(p_carrier),''),nullif(trim(p_tracking_reference),''),now())
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
  perform public.mark_eligible_payouts();
  perform public.audit_change('order.delivery_confirmed','order',p_order_id,null,jsonb_build_object('customer_id',auth.uid()));
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
  insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference)
  values(v_order.id,v_payment.id,'payment_received','paystack_clearing','protected_customer_funds',p_amount_kobo,p_reference);
  if p_provider_fee_kobo>0 then
    insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference)
    values(v_order.id,v_payment.id,'provider_fee','tailor_payable','paystack_fees',p_provider_fee_kobo,p_reference||':fee');
  end if;

  if v_payment.installment in ('deposit','full') then
    update public.orders
    set deposit_paid_at=p_paid_at,
        balance_paid_at=case when v_payment.installment='full' then p_paid_at else balance_paid_at end,
        status='active'
    where id=v_order.id;
    update public.capacity_reservations set consumed_at=now() where quote_id=v_order.quote_id and consumed_at is null;
    update public.tailor_profiles set active_job_count=active_job_count+1 where user_id=v_order.tailor_id;
  else
    update public.orders set balance_paid_at=p_paid_at,status='ready' where id=v_order.id;
  end if;

  if v_payment.installment in ('balance','full') then
    v_commission=round(v_order.tailoring_subtotal_kobo*0.10);
    v_tailor_payable=v_order.tailoring_subtotal_kobo+v_order.delivery_kobo-v_commission-(select coalesce(sum(provider_fee_kobo),0) from public.payments where order_id=v_order.id and status='successful');
    insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference)
    values(v_order.id,v_payment.id,'platform_commission','protected_customer_funds','platform_revenue',v_commission,p_reference||':commission');
    if v_tailor_payable>0 then
      insert into public.ledger_entries(order_id,payment_id,entry_type,debit_account,credit_account,amount_kobo,reference)
      values(v_order.id,v_payment.id,'tailor_payable','protected_customer_funds','tailor_payable:'||v_order.tailor_id,v_tailor_payable,p_reference||':payable');
    end if;
  end if;
  perform public.notify_user(v_order.customer_id,'payment.successful','Payment confirmed','Your full payment has been recorded in exact NGN.','/customer/payments');
  if v_payment.installment='full' then perform public.mark_eligible_payouts(); end if;
end $$;

-- Disputes must be openable as soon as the initial 50% payout becomes eligible
-- (right after payment, before shipment), not just from 'shipped' onward.
create or replace function public.open_customer_dispute(p_order_id uuid,p_reason text,p_description text,p_evidence_paths text[] default '{}') returns uuid
language plpgsql security definer set search_path=public as $$
declare v_order public.orders; v_dispute_id uuid; v_frozen bigint;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Authentication required'; end if;
  select * into v_order from public.orders where id=p_order_id and customer_id=auth.uid() for update;
  if not found or v_order.status not in ('active','awaiting_balance','ready','shipped','delivered','completed') then raise exception 'This order cannot be disputed'; end if;
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

create or replace function public.mark_eligible_payouts() returns integer
language plpgsql security definer set search_path=public as $$
declare
  v_order record;
  v_payable bigint;
  v_initial_amount bigint;
  v_final_amount bigint;
  v_initial_payout_id uuid;
  v_final_payout_id uuid;
  v_count integer := 0;
begin
  for v_order in
    select o.*
    from public.orders o
    where o.status in ('active','awaiting_balance','ready','shipped','delivered')
      and exists(select 1 from public.payments p where p.order_id=o.id and p.installment='full' and p.status='successful')
      and not exists(select 1 from public.disputes d where d.order_id=o.id and d.status not in ('closed','resolved_no_refund','resolved_partial','resolved_refund'))
  loop
    v_payable=greatest(0,v_order.tailoring_subtotal_kobo+v_order.delivery_kobo-round(v_order.tailoring_subtotal_kobo*.10)-coalesce((select sum(provider_fee_kobo) from public.payments p where p.order_id=v_order.id and p.status='successful'),0)-coalesce((select sum(amount_kobo) from public.refunds r where r.order_id=v_order.id and r.status='successful'),0));
    v_initial_amount=v_payable/2;
    v_initial_payout_id:=null;
    insert into public.payouts(tailor_id,order_id,amount_kobo,release_phase)
    values(v_order.tailor_id,v_order.id,v_initial_amount,'initial')
    on conflict(order_id,release_phase) do nothing
    returning id into v_initial_payout_id;
    if v_initial_payout_id is not null then
      v_count:=v_count+1;
      update public.orders set initial_payout_eligible_at=now() where id=v_order.id;
      perform public.notify_user(v_order.tailor_id,'payout.initial_eligible','First payout eligible','Your first 50% payout is ready for marketplace review.','/tailor/earnings');
    end if;
  end loop;

  for v_order in
    select o.*
    from public.orders o
    where o.status='delivered'
      and o.customer_approved_at is not null
      and exists(select 1 from public.payments p where p.order_id=o.id and p.installment='full' and p.status='successful')
      and not exists(select 1 from public.disputes d where d.order_id=o.id and d.status not in ('closed','resolved_no_refund','resolved_partial','resolved_refund'))
  loop
    v_payable=greatest(0,v_order.tailoring_subtotal_kobo+v_order.delivery_kobo-round(v_order.tailoring_subtotal_kobo*.10)-coalesce((select sum(provider_fee_kobo) from public.payments p where p.order_id=v_order.id and p.status='successful'),0)-coalesce((select sum(amount_kobo) from public.refunds r where r.order_id=v_order.id and r.status='successful'),0));
    select amount_kobo into v_initial_amount from public.payouts where order_id=v_order.id and release_phase='initial';
    if v_initial_amount is null then continue; end if;
    v_final_amount=greatest(0,v_payable-v_initial_amount);
    v_final_payout_id:=null;
    insert into public.payouts(tailor_id,order_id,amount_kobo,release_phase)
    values(v_order.tailor_id,v_order.id,v_final_amount,'final')
    on conflict(order_id,release_phase) do nothing
    returning id into v_final_payout_id;
    if v_final_payout_id is not null then
      v_count:=v_count+1;
      update public.orders set payout_eligible_at=now(),status='completed',completed_at=now() where id=v_order.id;
      perform public.notify_user(v_order.tailor_id,'payout.final_eligible','Final payout eligible','Your remaining payout is ready for marketplace review.','/tailor/earnings');
    end if;
  end loop;
  return v_count;
end $$;
