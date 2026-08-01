"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccount, requireRole } from "@/data/auth";
import { env } from "@/lib/env";
import { sendMarketplaceEmail } from "@/lib/notifications";
import { initializePaystackTransaction } from "@/lib/paystack";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MarketplaceActionState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };
export const marketplaceInitialState: MarketplaceActionState = { status: "idle" };

const imageSchema = z.object({ path: z.string().max(500), mimeType: z.enum(["image/jpeg","image/png","image/webp"]), sizeBytes: z.number().int().positive().max(10 * 1024 * 1024) });
const requestSchema = z.object({ tailorId: z.uuid(), garmentType: z.string().trim().min(2).max(80), description: z.string().trim().min(10).max(4000), hasFabric: z.boolean(), neededBy: z.coerce.date(), budgetNgn: z.coerce.number().finite().min(50000).max(100000000), measurementMethod: z.enum(["profile","call","later"]), deliveryPreference: z.enum(["shipping","pickup","decide_later"]), images: z.array(imageSchema).max(5) });
const messageSchema = z.object({ conversationId: z.uuid(), body: z.string().trim().min(1).max(4000), attachments: z.array(z.string().max(500)).max(5) });
const quoteSchema = z.object({ requestId: z.uuid(), tailoringNgn: z.coerce.number().finite().min(1000), deliveryNgn: z.coerce.number().finite().min(0), scope: z.string().trim().min(10).max(4000), dueDate: z.coerce.date(), expiresAt: z.coerce.date() });
const progressSchema = z.object({ orderId: z.uuid(), stage: z.enum(["design","materials","cutting","sewing","fitting","finishing","ready"]), note: z.string().trim().min(3).max(2000), imagePaths: z.array(z.string().max(500)).max(5) });
const shipmentSchema = z.object({ orderId: z.uuid(), method: z.enum(["shipping","pickup"]), carrier: z.string().trim().max(100), trackingReference: z.string().trim().max(160) });
const disputeSchema = z.object({ orderId: z.uuid(), reason: z.string().trim().min(3).max(300), description: z.string().trim().min(10).max(4000), evidencePaths: z.array(z.string().max(500)).max(5) });

function errorState(error: unknown): MarketplaceActionState {
  return { status: "error", message: error instanceof Error ? error.message : "We could not complete that request." };
}

function jsonImages(value: FormDataEntryValue | null) {
  try { return JSON.parse(String(value ?? "[]")); } catch { return []; }
}

function ngnToKobo(value: number) { return Math.round(value * 100); }

async function currentSupabase() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Marketplace services are not configured.");
  return supabase;
}

async function recipientEmail(userId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return undefined;
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email;
}

export async function submitRequest(_state: MarketplaceActionState, formData: FormData): Promise<MarketplaceActionState> {
  const parsed = requestSchema.safeParse({ tailorId: formData.get("tailorId"), garmentType: formData.get("garmentType"), description: formData.get("description"), hasFabric: formData.get("hasFabric") === "on", neededBy: formData.get("neededBy"), budgetNgn: formData.get("budgetNgn"), measurementMethod: formData.get("measurementMethod"), deliveryPreference: formData.get("deliveryPreference"), images: jsonImages(formData.get("images")) });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const account = await requireRole("customer");
    if ("demo" in account) return { status: "success", message: "Demo request posted." };
    const supabase = await currentSupabase();
    const { error } = await supabase.rpc("submit_request", { p_tailor_id: parsed.data.tailorId, p_garment_type: parsed.data.garmentType, p_description: parsed.data.description, p_has_fabric: parsed.data.hasFabric, p_needed_by: parsed.data.neededBy.toISOString().slice(0,10), p_budget_kobo: ngnToKobo(parsed.data.budgetNgn), p_measurement_method: parsed.data.measurementMethod, p_delivery_preference: parsed.data.deliveryPreference, p_images: parsed.data.images });
    if (error) throw new Error(error.message);
    revalidatePath("/customer"); revalidatePath("/tailor/quotes");
    return { status: "success", message: "Your request is with the selected tailor." };
  } catch (error) { return errorState(error); }
}

export async function sendMessage(_state: MarketplaceActionState, formData: FormData): Promise<MarketplaceActionState> {
  const parsed = messageSchema.safeParse({ conversationId: formData.get("conversationId"), body: formData.get("body"), attachments: jsonImages(formData.get("attachments")) });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const account = await requireAccount();
    if (account.role !== "customer" && account.role !== "tailor") throw new Error("Only marketplace members can send messages.");
    if ("demo" in account) return { status: "success" };
    const supabase = await currentSupabase();
    const { error } = await supabase.from("messages").insert({ conversation_id: parsed.data.conversationId, sender_id: account.user.id, body: parsed.data.body, attachment_paths: parsed.data.attachments });
    if (error) throw new Error(error.message);
    const { data: members } = await supabase.from("conversation_members").select("user_id").eq("conversation_id",parsed.data.conversationId).neq("user_id",account.user.id);
    for (const member of (members ?? []) as Array<{ user_id: string }>) await sendMarketplaceEmail({ to: await recipientEmail(member.user_id), subject: "New StitchLink message", text: `${account.displayName}: ${parsed.data.body}` });
    revalidatePath("/customer/messages"); revalidatePath("/tailor/quotes");
    return { status: "success" };
  } catch (error) { return errorState(error); }
}

export async function sendQuote(_state: MarketplaceActionState, formData: FormData): Promise<MarketplaceActionState> {
  const parsed = quoteSchema.safeParse({ requestId: formData.get("requestId"), tailoringNgn: formData.get("tailoringNgn"), deliveryNgn: formData.get("deliveryNgn"), scope: formData.get("scope"), dueDate: formData.get("dueDate"), expiresAt: formData.get("expiresAt") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const account = await requireRole("tailor"); if ("demo" in account) return { status: "success" };
    const supabase = await currentSupabase();
    const { error } = await supabase.rpc("send_quote", { p_request_id: parsed.data.requestId, p_tailoring_kobo: ngnToKobo(parsed.data.tailoringNgn), p_delivery_kobo: ngnToKobo(parsed.data.deliveryNgn), p_scope: parsed.data.scope, p_due_date: parsed.data.dueDate.toISOString().slice(0,10), p_expires_at: parsed.data.expiresAt.toISOString() });
    if (error) throw new Error(error.message);
    revalidatePath("/tailor/quotes"); revalidatePath("/customer");
    return { status: "success", message: "Quote sent to the customer." };
  } catch (error) { return errorState(error); }
}

export async function acceptQuote(quoteId: string): Promise<MarketplaceActionState> {
  try {
    const account = await requireRole("customer"); if ("demo" in account) return { status: "success" };
    const supabase = await currentSupabase();
    const { error } = await supabase.rpc("accept_quote_and_reserve", { p_quote_id: quoteId });
    if (error) throw new Error(error.message);
    revalidatePath("/customer"); revalidatePath("/customer/orders"); revalidatePath("/tailor/jobs");
    return { status: "success", message: "Quote accepted. Pay the deposit to activate your order." };
  } catch (error) { return errorState(error); }
}

export async function addProgress(_state: MarketplaceActionState, formData: FormData): Promise<MarketplaceActionState> {
  const parsed = progressSchema.safeParse({ orderId: formData.get("orderId"), stage: formData.get("stage"), note: formData.get("note"), imagePaths: jsonImages(formData.get("imagePaths")) });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  try { const account=await requireRole("tailor");if("demo" in account)return{status:"success"};const supabase=await currentSupabase();const{error}=await supabase.rpc("add_progress_update",{p_order_id:parsed.data.orderId,p_stage:parsed.data.stage,p_note:parsed.data.note,p_image_paths:parsed.data.imagePaths});if(error)throw new Error(error.message);revalidatePath("/tailor/jobs");revalidatePath("/customer/orders");return{status:"success",message:"Customer update posted."}; } catch(error){return errorState(error);}
}

export async function recordShipment(_state: MarketplaceActionState, formData: FormData): Promise<MarketplaceActionState> {
  const parsed = shipmentSchema.safeParse({ orderId: formData.get("orderId"), method: formData.get("method"), carrier: formData.get("carrier"), trackingReference: formData.get("trackingReference") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  try { const account=await requireRole("tailor");if("demo" in account)return{status:"success"};const supabase=await currentSupabase();const{error}=await supabase.rpc("record_shipment",{p_order_id:parsed.data.orderId,p_method:parsed.data.method,p_carrier:parsed.data.carrier,p_tracking_reference:parsed.data.trackingReference});if(error)throw new Error(error.message);revalidatePath("/tailor/jobs");revalidatePath("/customer/orders");return{status:"success",message:"Shipment recorded."}; } catch(error){return errorState(error);}
}

export async function confirmDelivery(orderId: string): Promise<MarketplaceActionState> {
  try { const account=await requireRole("customer");if("demo" in account)return{status:"success"};const supabase=await currentSupabase();const{error}=await supabase.rpc("confirm_delivery",{p_order_id:orderId});if(error)throw new Error(error.message);revalidatePath("/customer/orders");revalidatePath("/tailor/earnings");return{status:"success",message:"Delivery confirmed. Thank you."}; } catch(error){return errorState(error);}
}

export async function openDispute(_state: MarketplaceActionState, formData: FormData): Promise<MarketplaceActionState> {
  const parsed=disputeSchema.safeParse({orderId:formData.get("orderId"),reason:formData.get("reason"),description:formData.get("description"),evidencePaths:jsonImages(formData.get("evidencePaths"))});
  if(!parsed.success)return{status:"error",fieldErrors:parsed.error.flatten().fieldErrors};
  try { const account=await requireRole("customer");if("demo" in account)return{status:"success"};const supabase=await currentSupabase();const{error}=await supabase.rpc("open_customer_dispute",{p_order_id:parsed.data.orderId,p_reason:parsed.data.reason,p_description:parsed.data.description,p_evidence_paths:parsed.data.evidencePaths});if(error)throw new Error(error.message);revalidatePath("/customer/orders");revalidatePath("/admin/disputes");return{status:"success",message:"Your dispute has been opened."}; } catch(error){return errorState(error);}
}

export async function createBalanceLink(orderId: string): Promise<MarketplaceActionState> {
  try {
    const account=await requireRole("admin"); if("demo" in account)return{status:"success"};
    const supabase=await currentSupabase(); const reference=`STL-BAL-${randomUUID()}`;
    const {data:amount,error}=await supabase.rpc("admin_reserve_balance_payment",{p_order_id:orderId,p_reference:reference}); if(error)throw new Error(error.message);
    const admin=createSupabaseAdminClient(); if(!admin)throw new Error("Payment service is unavailable.");
    const {data:order,error:orderError}=await admin.from("orders").select("customer_id").eq("id",orderId).single(); if(orderError||!order)throw new Error("Order not found.");
    const {data:userData}=await admin.auth.admin.getUserById(order.customer_id); const email=userData.user?.email; if(!email)throw new Error("Customer email is unavailable.");
    const checkout=await initializePaystackTransaction({email,amountKobo:Number(amount),reference,callbackUrl:`${env.NEXT_PUBLIC_SITE_URL}/customer/payments?reference=${encodeURIComponent(reference)}`,metadata:{order_id:orderId,installment:"balance"}});
    await admin.from("payments").update({authorization_url:checkout.authorization_url,initialized_at:new Date().toISOString()}).eq("reference",reference);
    await sendMarketplaceEmail({to:email,subject:"Your StitchLink balance payment link",text:`Your order is ready for its balance payment. Complete checkout securely: ${checkout.authorization_url}`});
    revalidatePath("/admin/payments");revalidatePath("/customer/payments");return{status:"success",message:"Balance link created and emailed."};
  } catch(error){return errorState(error);}
}

export async function reviewApplication(applicationId: string, approved: boolean, reason = ""): Promise<MarketplaceActionState> {
  try {
    const account = await requireRole("admin");
    if ("demo" in account) return { status: "success", message: approved ? "Demo: application approved." : "Demo: application rejected." };
    const supabase = await currentSupabase();
    const { error } = await supabase.rpc("admin_review_application", { p_application_id: applicationId, p_approved: approved, p_reason: reason });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/verification");
    revalidatePath("/tailors");
    revalidatePath("/tailors/[slug]", "page");
    return { status: "success", message: approved ? "Tailor approved and published." : "Application rejected." };
  } catch (error) { return errorState(error); }
}

export async function recordPayout(payoutId: string, providerReference: string): Promise<MarketplaceActionState> {
  try {const account=await requireRole("admin");if("demo" in account)return{status:"success"};const supabase=await currentSupabase();const{error}=await supabase.rpc("admin_record_payout",{p_payout_id:payoutId,p_provider_reference:providerReference});if(error)throw new Error(error.message);revalidatePath("/admin/payments");revalidatePath("/tailor/earnings");return{status:"success",message:"External payout recorded."};}catch(error){return errorState(error);}
}

export async function recordRefund(refundId: string, providerReference: string): Promise<MarketplaceActionState> {
  try {const account=await requireRole("admin");if("demo" in account)return{status:"success"};const supabase=await currentSupabase();const{error}=await supabase.rpc("admin_record_refund",{p_refund_id:refundId,p_provider_reference:providerReference});if(error)throw new Error(error.message);revalidatePath("/admin/disputes");revalidatePath("/admin/payments");return{status:"success",message:"External refund recorded."};}catch(error){return errorState(error);}
}
