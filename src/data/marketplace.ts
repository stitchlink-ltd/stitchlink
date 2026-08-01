import "server-only";

import { capacityForGrade } from "@/lib/grading";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tailor } from "@/lib/types";

export type PublishedTailor = { id: string; slug: string; studioName: string; city: string; state: string; specialties: string[]; grade: number; startingPriceKobo: number; activeJobs: number; capacity: number };

export async function getPublishedTailors(): Promise<PublishedTailor[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from("tailor_profiles").select("user_id,slug,studio_name,city,state,specialties,grade,starting_price_kobo,active_job_count").eq("published",true).eq("verification_status","approved").order("studio_name");
  return ((data ?? []) as Array<Record<string, unknown>>).map((tailor) => ({ id: String(tailor.user_id), slug: String(tailor.slug), studioName: String(tailor.studio_name), city: String(tailor.city), state: String(tailor.state), specialties: Array.isArray(tailor.specialties) ? tailor.specialties.map(String) : [], grade: Number(tailor.grade), startingPriceKobo: Number(tailor.starting_price_kobo), activeJobs: Number(tailor.active_job_count), capacity: 0 }));
}

const tailorDirectoryColumns = "user_id,slug,studio_name,bio,city,state,specialties,grade,starting_price_kobo,turnaround_min_days,turnaround_max_days,active_job_count,completed_job_count,average_rating,on_time_rate,profiles(display_name)";

function formatTurnaround(minDays: number, maxDays: number) {
  const minWeeks = Math.max(1, Math.round(minDays / 7));
  const maxWeeks = Math.max(minWeeks, Math.round(maxDays / 7));
  return minWeeks === maxWeeks ? `${minWeeks} week${minWeeks > 1 ? "s" : ""}` : `${minWeeks}–${maxWeeks} weeks`;
}

function mapTailorRow(row: Record<string, unknown>): Tailor {
  const grade = Number(row.grade) as 1 | 2 | 3 | 4 | 5;
  const profile = row.profiles as Record<string, unknown> | null;
  return {
    id: String(row.user_id),
    slug: String(row.slug),
    name: String(profile?.display_name ?? row.studio_name),
    studio: String(row.studio_name),
    location: [row.city, row.state].filter(Boolean).join(", "),
    grade,
    rating: Number(row.average_rating),
    reviews: 0,
    completedJobs: Number(row.completed_job_count),
    onTimeRate: Number(row.on_time_rate),
    specialties: Array.isArray(row.specialties) ? row.specialties.map(String) : [],
    startingPriceKobo: Number(row.starting_price_kobo),
    turnaround: formatTurnaround(Number(row.turnaround_min_days), Number(row.turnaround_max_days)),
    activeJobs: Number(row.active_job_count),
    capacity: capacityForGrade(grade),
    imagePosition: "50% center",
    bio: String(row.bio ?? ""),
    verified: true,
  };
}

export async function getPublishedTailorDirectory(): Promise<Tailor[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from("tailor_profiles").select(tailorDirectoryColumns).eq("published", true).eq("verification_status", "approved").order("studio_name");
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapTailorRow);
}

export async function getPublishedTailorProfile(slug: string): Promise<Tailor | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from("tailor_profiles").select(tailorDirectoryColumns).eq("published", true).eq("verification_status", "approved").eq("slug", slug).maybeSingle();
  return data ? mapTailorRow(data as Record<string, unknown>) : null;
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
