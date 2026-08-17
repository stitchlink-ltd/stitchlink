-- profiles_read only ever allowed id=auth.uid() (or admin), so a tailor could never
-- see their customer's display name (or vice versa) even while actively negotiating
-- or fulfilling an order together -- every such join silently fell back to a generic
-- "Customer"/"Tailor" placeholder. Allow either party to read the other's profile
-- once they share a request or order.
create policy profiles_marketplace_party_read on public.profiles for select using(
  exists(select 1 from public.custom_requests r where (r.customer_id=profiles.id and r.preferred_tailor_id=auth.uid()) or (r.preferred_tailor_id=profiles.id and r.customer_id=auth.uid()))
  or exists(select 1 from public.orders o where (o.customer_id=profiles.id and o.tailor_id=auth.uid()) or (o.tailor_id=profiles.id and o.customer_id=auth.uid()))
);
