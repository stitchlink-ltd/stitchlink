import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import { initializePaystackTransaction } from "@/lib/paystack";
import { splitInstallments } from "@/lib/money";
import { enforceRateLimit, requestIdentifier } from "@/lib/rate-limit";
import { forbiddenResponse, isSameSiteRequest } from "@/lib/request-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema=z.object({orderId:z.uuid(),installment:z.enum(["deposit","balance"])});

export async function POST(request:Request){
  if(!isSameSiteRequest(request))return forbiddenResponse();
  const rate=await enforceRateLimit("checkout",requestIdentifier(request),8);
  if(!rate.success)return Response.json({error:"Too many checkout attempts"},{status:429,headers:{"Retry-After":String(rate.retryAfter)}});
  const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Invalid payment request"},{status:400});
  const supabase=await createSupabaseServerClient();
  if(!supabase)return Response.json({error:"Payments require configured Supabase and Paystack credentials"},{status:503});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return Response.json({error:"Authentication required"},{status:401});
  const {data:order,error}=await supabase.from("orders").select("id,customer_id,tailoring_subtotal_kobo,delivery_kobo,currency,deposit_paid_at,balance_paid_at").eq("id",parsed.data.orderId).eq("customer_id",user.id).single();
  if(error||!order)return Response.json({error:"Order not found"},{status:404});
  if(order.currency!=="NGN")return Response.json({error:"StitchLink checkout supports exact NGN charges only"},{status:409});
  if(parsed.data.installment==="deposit"&&order.deposit_paid_at)return Response.json({error:"Deposit already paid"},{status:409});
  if(parsed.data.installment!=="deposit")return Response.json({error:"Balance links are issued by marketplace staff"},{status:403});
  if(order.deposit_paid_at)return Response.json({error:"Deposit already paid"},{status:409});
  const total=order.tailoring_subtotal_kobo+order.delivery_kobo;const split=splitInstallments(total);const amountKobo=parsed.data.installment==="deposit"?split.depositKobo:split.balanceKobo;const reference=`STL-${parsed.data.installment.slice(0,3).toUpperCase()}-${randomUUID()}`;
  const {data:pending}=await supabase.from("payments").select("reference,authorization_url,amount_kobo").eq("order_id",order.id).eq("installment",parsed.data.installment).eq("status","pending").maybeSingle();
  if(pending?.authorization_url)return Response.json({authorizationUrl:pending.authorization_url,reference:pending.reference,amountKobo:pending.amount_kobo,currency:"NGN"});
  if(pending)await supabase.from("payments").update({status:"failed",initialization_error:"Replaced after an incomplete checkout initialization"}).eq("reference",pending.reference);
  const {error:insertError}=await supabase.from("payments").insert({order_id:order.id,customer_id:user.id,reference,installment:parsed.data.installment,amount_kobo:amountKobo,currency:"NGN",status:"pending"});
  if(insertError)return Response.json({error:"Unable to reserve payment reference"},{status:500});
  try{const data=await initializePaystackTransaction({email:user.email!,amountKobo,reference,callbackUrl:`${env.NEXT_PUBLIC_SITE_URL}/customer/payments?reference=${encodeURIComponent(reference)}`,metadata:{order_id:order.id,installment:parsed.data.installment}});await supabase.from("payments").update({authorization_url:data.authorization_url,initialized_at:new Date().toISOString()}).eq("reference",reference);return Response.json({authorizationUrl:data.authorization_url,reference,amountKobo,currency:"NGN"});}catch{await supabase.from("payments").update({status:"failed",initialization_error:"Paystack initialization failed"}).eq("reference",reference);return Response.json({error:"Paystack initialization failed"},{status:502});}
}
