import { z } from "zod";
import { verifyPaystackSignature, verifyPaystackTransaction } from "@/lib/paystack";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const eventSchema=z.object({event:z.string(),data:z.object({id:z.number(),reference:z.string(),amount:z.number(),currency:z.string(),status:z.string()}).passthrough()});

export async function POST(request:Request){
  const raw=await request.text();
  if(!verifyPaystackSignature(raw,request.headers.get("x-paystack-signature")))return new Response("Invalid signature",{status:401});
  const parsed=eventSchema.safeParse(JSON.parse(raw));
  if(!parsed.success)return new Response("Invalid event",{status:400});
  const admin=createSupabaseAdminClient();if(!admin)return new Response("Service unavailable",{status:503});
  const eventKey=`${parsed.data.event}:${parsed.data.data.id}`;
  const {error:eventError}=await admin.from("webhook_events").insert({provider:"paystack",event_key:eventKey,event_type:parsed.data.event,payload:parsed.data});
  if(eventError?.code==="23505")return new Response("Already processed",{status:200});
  if(eventError)return new Response("Unable to record event",{status:500});
  if(parsed.data.event==="charge.success"){
    const verified=await verifyPaystackTransaction(parsed.data.data.reference);
    if(verified.status!=="success"||verified.currency!=="NGN"||verified.amount!==parsed.data.data.amount)return new Response("Verification mismatch",{status:409});
    const {error}=await admin.rpc("record_successful_payment",{p_reference:verified.reference,p_amount_kobo:verified.amount,p_provider_fee_kobo:verified.fees??0,p_paid_at:verified.paid_at,p_event_key:eventKey});
    if(error)return new Response("Ledger update failed",{status:500});
  }
  return new Response("OK");
}
