import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PublishedTailor = { id: string; slug: string; studioName: string; city: string; state: string; specialties: string[]; grade: number; startingPriceKobo: number; activeJobs: number; capacity: number };

export async function getPublishedTailors(): Promise<PublishedTailor[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from("tailor_profiles").select("user_id,slug,studio_name,city,state,specialties,grade,starting_price_kobo,active_job_count").eq("published",true).eq("verification_status","approved").order("studio_name");
  return ((data ?? []) as Array<Record<string, unknown>>).map((tailor) => ({ id: String(tailor.user_id), slug: String(tailor.slug), studioName: String(tailor.studio_name), city: String(tailor.city), state: String(tailor.state), specialties: Array.isArray(tailor.specialties) ? tailor.specialties.map(String) : [], grade: Number(tailor.grade), startingPriceKobo: Number(tailor.starting_price_kobo), activeJobs: Number(tailor.active_job_count), capacity: 0 }));
}

export type MarketplaceOrder = { id: string; reference: string; tailorId: string; title: string; status: string; stage: string; totalKobo: number; dueDate: string; depositPaidAt: string | null; balancePaidAt: string | null };

export async function getCustomerOrders(customerId: string): Promise<MarketplaceOrder[]> {
  const supabase = await createSupabaseServerClient(); if (!supabase) return [];
  const { data } = await supabase.from("orders").select("id,reference,tailor_id,tailoring_subtotal_kobo,delivery_kobo,status,stage,due_date,deposit_paid_at,balance_paid_at,custom_requests(garment_type)").eq("customer_id",customerId).order("created_at",{ascending:false});
  return ((data ?? []) as Array<Record<string, unknown>>).map((order) => ({ id:String(order.id),reference:String(order.reference),tailorId:String(order.tailor_id),title:String((order.custom_requests as Record<string,unknown> | null)?.garment_type ?? "Custom piece"),status:String(order.status),stage:String(order.stage),totalKobo:Number(order.tailoring_subtotal_kobo)+Number(order.delivery_kobo),dueDate:String(order.due_date),depositPaidAt:order.deposit_paid_at ? String(order.deposit_paid_at) : null,balancePaidAt:order.balance_paid_at ? String(order.balance_paid_at) : null }));
}

export type TailorRequest = { id: string; customerName: string; garmentType: string; description: string; budgetKobo: number; neededBy: string; status: string };

export async function getTailorRequests(tailorId: string): Promise<TailorRequest[]> {
  const supabase = await createSupabaseServerClient(); if (!supabase) return [];
  const { data } = await supabase.from("custom_requests").select("id,garment_type,description,budget_kobo,needed_by,status,customer_id,profiles!custom_requests_customer_id_fkey(display_name)").eq("preferred_tailor_id",tailorId).in("status",["submitted","negotiating","quoted"]).order("created_at",{ascending:false});
  return ((data ?? []) as Array<Record<string, unknown>>).map((request) => ({ id:String(request.id),customerName:String((request.profiles as Record<string,unknown> | null)?.display_name ?? "Customer"),garmentType:String(request.garment_type),description:String(request.description),budgetKobo:Number(request.budget_kobo),neededBy:String(request.needed_by),status:String(request.status) }));
}
