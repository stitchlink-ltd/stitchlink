-- submit_request's image-path check used `\\.` inside a standard-conforming
-- string literal, which Postgres does NOT collapse to an escaped dot — it
-- stays as two literal backslashes followed by a wildcard `.`, so the regex
-- required a literal backslash character no real upload path ever has. Every
-- request submission with an attached image has failed with "Invalid request
-- image" since this function was written; it was never exercised end-to-end
-- until a real customer with a real image reached it.
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
    if coalesce(v_image->>'path','') !~ ('^' || auth.uid()::text || '/request/[0-9a-f-]+\.(jpg|png|webp)$') then raise exception 'Invalid request image'; end if;
    insert into public.request_images(request_id,storage_path,mime_type,size_bytes)
    values(v_request_id,v_image->>'path',v_image->>'mimeType',(v_image->>'sizeBytes')::integer);
  end loop;
  insert into public.conversations(request_id) values(v_request_id) returning id into v_conversation_id;
  insert into public.conversation_members(conversation_id,user_id) values(v_conversation_id,auth.uid()),(v_conversation_id,p_tailor_id);
  perform public.notify_user(p_tailor_id,'request.submitted','New custom request',trim(p_garment_type)||' request awaiting your quote','/tailor/quotes');
  perform public.audit_change('request.submitted','custom_request',v_request_id,null,jsonb_build_object('tailor_id',p_tailor_id));
  return v_request_id;
end $$;
