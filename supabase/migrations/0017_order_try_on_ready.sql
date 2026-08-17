-- Lets a tailor gate the customer's "Try it on" preview to a specific order once
-- there's actually enough of the garment done to be worth previewing. No direct RLS
-- write policy on `orders` for tailors (writes go through security-definer RPCs, matching
-- add_progress_update/record_shipment/etc.), so this follows the same pattern.
alter table public.orders add column if not exists try_on_ready boolean not null default false;

create or replace function public.set_try_on_ready(p_order_id uuid, p_ready boolean) returns void
language plpgsql security definer set search_path=public as $$
declare v_order public.orders;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Authentication required'; end if;
  select * into v_order from public.orders where id=p_order_id and tailor_id=auth.uid() for update;
  if not found or v_order.status not in ('active','awaiting_balance','ready') then raise exception 'Order cannot be updated'; end if;
  update public.orders set try_on_ready=p_ready where id=p_order_id;
  if p_ready then
    perform public.notify_user(v_order.customer_id,'order.try_on_ready','Try it on is ready','Your tailor marked this order ready for a virtual try-on preview.','/customer/orders/'||p_order_id);
  end if;
  perform public.audit_change('order.try_on_ready_set','order',p_order_id,null,jsonb_build_object('ready',p_ready));
end $$;

grant execute on function public.set_try_on_ready(uuid,boolean) to authenticated;
