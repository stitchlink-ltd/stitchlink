-- Wires up public.appointments (provisioned in 0001 but never given a write
-- path) with security-definer RPCs, following the same convention as
-- submit_request/send_quote/record_shipment: no direct RLS insert/update
-- policies, only ownership-checked functions.

alter table public.appointments add column if not exists google_event_id text;
alter table public.appointments add column if not exists calendar_owner_id uuid references public.profiles(id);

create table if not exists public.order_calendar_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_type text not null check (milestone_type in ('due_date','delivery_reminder')),
  google_event_id text not null,
  synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id,user_id,milestone_type)
);
alter table public.order_calendar_events enable row level security;
create policy order_calendar_events_owner on public.order_calendar_events for select using(user_id=auth.uid());
revoke insert,update,delete on public.order_calendar_events from anon,authenticated;

create trigger set_order_calendar_events_updated_at before update on public.order_calendar_events
  for each row execute function public.set_updated_at();

create or replace function public.book_appointment(p_tailor_id uuid,p_request_id uuid,p_order_id uuid,p_starts_at timestamptz,p_ends_at timestamptz) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Authentication required'; end if;
  if p_request_id is null and p_order_id is null then raise exception 'An appointment must reference a request or order'; end if;
  if p_ends_at<=p_starts_at then raise exception 'End time must be after start time'; end if;
  if p_request_id is not null and not exists(select 1 from public.custom_requests where id=p_request_id and customer_id=auth.uid() and preferred_tailor_id=p_tailor_id) then raise exception 'Not authorized for this request'; end if;
  if p_order_id is not null and not exists(select 1 from public.orders where id=p_order_id and customer_id=auth.uid() and tailor_id=p_tailor_id) then raise exception 'Not authorized for this order'; end if;
  insert into public.appointments(request_id,order_id,customer_id,tailor_id,starts_at,ends_at,status)
  values(p_request_id,p_order_id,auth.uid(),p_tailor_id,p_starts_at,p_ends_at,'scheduled') returning id into v_id;
  perform public.notify_user(p_tailor_id,'appointment.booked','New fitting call booked','A customer booked a fitting call.','/tailor/appointments');
  return v_id;
end $$;
grant execute on function public.book_appointment(uuid,uuid,uuid,timestamptz,timestamptz) to authenticated;

create or replace function public.cancel_appointment(p_appointment_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v_row public.appointments;
begin
  select * into v_row from public.appointments where id=p_appointment_id and (customer_id=auth.uid() or tailor_id=auth.uid()) for update;
  if not found then raise exception 'Appointment not found'; end if;
  update public.appointments set status='cancelled' where id=p_appointment_id;
  perform public.notify_user(case when auth.uid()=v_row.customer_id then v_row.tailor_id else v_row.customer_id end,'appointment.cancelled','A fitting call was cancelled','The other party cancelled a scheduled fitting call.','/customer/appointments');
end $$;
grant execute on function public.cancel_appointment(uuid) to authenticated;

create or replace function public.reschedule_appointment(p_appointment_id uuid,p_starts_at timestamptz,p_ends_at timestamptz) returns void
language plpgsql security definer set search_path=public as $$
declare v_row public.appointments;
begin
  if p_ends_at<=p_starts_at then raise exception 'End time must be after start time'; end if;
  select * into v_row from public.appointments where id=p_appointment_id and (customer_id=auth.uid() or tailor_id=auth.uid()) for update;
  if not found then raise exception 'Appointment not found'; end if;
  update public.appointments set starts_at=p_starts_at,ends_at=p_ends_at,status='rescheduled' where id=p_appointment_id;
  perform public.notify_user(case when auth.uid()=v_row.customer_id then v_row.tailor_id else v_row.customer_id end,'appointment.rescheduled','A fitting call was rescheduled','The other party rescheduled a fitting call.','/customer/appointments');
end $$;
grant execute on function public.reschedule_appointment(uuid,timestamptz,timestamptz) to authenticated;
