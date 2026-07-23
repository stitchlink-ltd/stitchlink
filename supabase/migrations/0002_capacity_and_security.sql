-- Atomic quote acceptance prevents overbooking under concurrent checkout.
create or replace function public.accept_quote_and_reserve(p_quote_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_quote public.quotes; v_request public.custom_requests; v_tailor public.tailor_profiles; v_capacity integer; v_reserved integer; v_order_id uuid; v_reference text;
begin
  select * into v_quote from public.quotes where id=p_quote_id and status='sent' and expires_at>now() for update;
  if not found then raise exception 'Quote is unavailable'; end if;
  select * into v_request from public.custom_requests where id=v_quote.request_id and customer_id=auth.uid() for update;
  if not found then raise exception 'Not authorized to accept this quote'; end if;
  select * into v_tailor from public.tailor_profiles where user_id=v_quote.tailor_id for update;
  select active_job_capacity into v_capacity from public.grade_policies where grade=coalesce(case when v_tailor.grade_override_expires_at>now() then v_tailor.grade_override end,v_tailor.grade);
  select count(*) into v_reserved from public.capacity_reservations where tailor_id=v_tailor.user_id and consumed_at is null and expires_at>now();
  if v_tailor.active_job_count+v_reserved>=v_capacity then raise exception 'Tailor has reached active-job capacity'; end if;
  update public.quotes set status='superseded' where request_id=v_quote.request_id and id<>v_quote.id and status in ('draft','sent');
  update public.quotes set status='accepted',accepted_at=now() where id=v_quote.id;
  update public.custom_requests set status='accepted' where id=v_request.id;
  insert into public.capacity_reservations(tailor_id,quote_id,customer_id) values(v_quote.tailor_id,v_quote.id,auth.uid());
  v_reference='STL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.orders(reference,request_id,quote_id,customer_id,tailor_id,tailoring_subtotal_kobo,delivery_kobo,currency,due_date) values(v_reference,v_request.id,v_quote.id,auth.uid(),v_quote.tailor_id,v_quote.tailoring_subtotal_kobo,v_quote.delivery_kobo,'NGN',v_quote.due_date) returning id into v_order_id;
  return v_order_id;
end $$;

create policy reservations_party_read on public.capacity_reservations for select using(customer_id=auth.uid() or tailor_id=auth.uid() or public.is_admin());
create policy quotes_tailor_update on public.quotes for update using(tailor_id=auth.uid() or public.is_admin());
create policy orders_admin_update on public.orders for update using(public.is_admin());
create policy deliveries_tailor_write on public.deliveries for all using(public.is_order_party(order_id)) with check(public.is_order_party(order_id));

-- Ensure these internal tables are never writable through the anon/authenticated API.
revoke all on public.ledger_entries,public.webhook_events,public.audit_events from anon,authenticated;
grant select on public.ledger_entries to authenticated;
grant select on public.audit_events to authenticated;
grant execute on function public.accept_quote_and_reserve(uuid) to authenticated;
revoke execute on function public.record_successful_payment(text,bigint,bigint,timestamptz,text) from public,anon,authenticated;
revoke execute on function public.mark_eligible_payouts() from public,anon,authenticated;
revoke execute on function public.recalculate_tailor_grades() from public,anon,authenticated;
