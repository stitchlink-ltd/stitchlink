-- admin_review_application never actually ran successfully before: every prior
-- "approval" went through a demo session, which short-circuits before calling
-- this RPC at all. The first real invocation surfaced a PL/pgSQL quirk — a
-- CASE expression built from bare string literals resolves as `text` before
-- the enum-column assignment context applies, so Postgres rejected the
-- UPDATE with "column is of type verification_status but expression is of
-- type text". Casting the CASE result explicitly fixes it.
create or replace function public.admin_review_application(p_application_id uuid,p_approved boolean,p_reason text default '') returns void
language plpgsql security definer set search_path=public as $$
declare v_application public.tailor_applications;
begin
  perform public.require_admin_mfa();
  select * into v_application from public.tailor_applications where id=p_application_id for update;
  if not found then raise exception 'Application not found'; end if;
  update public.tailor_applications set status=(case when p_approved then 'approved' else 'rejected' end)::public.verification_status,assigned_admin_id=auth.uid(),decision_reason=nullif(trim(p_reason),''),decided_at=now() where id=p_application_id;
  update public.tailor_profiles set verification_status=(case when p_approved then 'approved' else 'rejected' end)::public.verification_status,published=p_approved where user_id=v_application.tailor_id;
  perform public.notify_user(v_application.tailor_id,'verification.reviewed',case when p_approved then 'Your atelier is verified' else 'Your verification needs attention' end,coalesce(nullif(trim(p_reason),''),case when p_approved then 'Your profile is now visible to customers.' else 'Review the decision notes and contact support.' end),'/tailor/verification');
  perform public.audit_change('verification.reviewed','tailor_application',p_application_id,null,jsonb_build_object('approved',p_approved));
end $$;
