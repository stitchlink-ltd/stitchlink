-- Tailors could create a draft application via onboarding but had no way to
-- actually submit it for review — admin_review_application only ever acted
-- on applications an admin already saw, and nothing moved status past 'draft'.
create or replace function public.submit_tailor_application(p_application_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare
  v_application public.tailor_applications;
  v_document_types text[];
  v_required text[] := array['government_id','address_proof','bank_proof','portfolio_ownership'];
  v_admin record;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Authentication required'; end if;
  select * into v_application from public.tailor_applications where id=p_application_id and tailor_id=auth.uid() for update;
  if not found then raise exception 'Application not found'; end if;
  if v_application.status not in ('draft','rejected') then raise exception 'Application has already been submitted'; end if;

  select array_agg(distinct document_type) into v_document_types from public.verification_documents where application_id=p_application_id;
  if not (v_required <@ coalesce(v_document_types,'{}')) then raise exception 'Upload all required documents before submitting'; end if;

  update public.tailor_applications set status='submitted',submitted_at=now(),assigned_admin_id=null,decision_reason=null,decided_at=null where id=p_application_id;
  update public.tailor_profiles set verification_status='submitted' where user_id=auth.uid();

  for v_admin in select id from public.profiles where role='admin' loop
    perform public.notify_user(v_admin.id,'verification.submitted','New tailor application','A tailor submitted documents for verification review.','/admin/verification');
  end loop;

  perform public.audit_change('application.submitted','tailor_application',p_application_id,null,jsonb_build_object('tailor_id',auth.uid()));
end $$;

grant execute on function public.submit_tailor_application(uuid) to authenticated;
