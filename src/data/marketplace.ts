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

export type RequestOrder = { id: string; status: string; stage: string; depositPaidAt: string | null; balancePaidAt: string | null; reference: string };
export type TailorRequest = { id: string; customerName: string; garmentType: string; description: string; budgetKobo: number; neededBy: string; status: string; images: { id: string }[]; conversationId: string | null; order: RequestOrder | null };

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getTailorRequests(tailorId: string): Promise<TailorRequest[]> {
  const supabase = await createSupabaseServerClient(); if (!supabase) return [];
  const { data } = await supabase.from("custom_requests").select("id,garment_type,description,budget_kobo,needed_by,status,customer_id,profiles!custom_requests_customer_id_fkey(display_name),request_images(id),orders(id,status,stage,deposit_paid_at,balance_paid_at,reference),conversations(id)").eq("preferred_tailor_id",tailorId).in("status",["submitted","negotiating","quoted","accepted"]).order("created_at",{ascending:false});
  return ((data ?? []) as Array<Record<string, unknown>>).map((request) => {
    const conversation = firstOrNull(request.conversations as Record<string, unknown> | Array<Record<string, unknown>> | null);
    const order = firstOrNull(request.orders as Record<string, unknown> | Array<Record<string, unknown>> | null);
    return { id:String(request.id),customerName:String((request.profiles as Record<string,unknown> | null)?.display_name ?? "Customer"),garmentType:String(request.garment_type),description:String(request.description),budgetKobo:Number(request.budget_kobo),neededBy:String(request.needed_by),status:String(request.status),images:((request.request_images as Array<Record<string,unknown>> | null) ?? []).map((image)=>({id:String(image.id)})),conversationId:conversation ? String(conversation.id) : null,order: order ? { id: String(order.id), status: String(order.status), stage: String(order.stage), depositPaidAt: order.deposit_paid_at ? String(order.deposit_paid_at) : null, balancePaidAt: order.balance_paid_at ? String(order.balance_paid_at) : null, reference: String(order.reference) } : null };
  });
}

export type RequestQuote = { id: string; revision: number; tailoringKobo: number; deliveryKobo: number; scope: string; dueDate: string; status: string; expiresAt: string };
export type CustomerRequest = {
  id: string;
  garmentType: string;
  description: string;
  budgetKobo: number;
  neededBy: string;
  status: string;
  tailorName: string;
  images: { id: string }[];
  quotes: RequestQuote[];
  order: RequestOrder | null;
  conversationId: string | null;
};

export async function getCustomerRequests(customerId: string): Promise<CustomerRequest[]> {
  const supabase = await createSupabaseServerClient(); if (!supabase) return [];
  const { data } = await supabase
    .from("custom_requests")
    .select("id,garment_type,description,budget_kobo,needed_by,status,tailor_profiles!custom_requests_preferred_tailor_id_fkey(studio_name),request_images(id),quotes(id,revision,tailoring_subtotal_kobo,delivery_kobo,scope,due_date,status,expires_at),orders(id,status,stage,deposit_paid_at,balance_paid_at,reference),conversations(id)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as Array<Record<string, unknown>>).map((request) => {
    const tailor = request.tailor_profiles as Record<string, unknown> | null;
    const order = firstOrNull(request.orders as Record<string, unknown> | Array<Record<string, unknown>> | null);
    const conversation = firstOrNull(request.conversations as Record<string, unknown> | Array<Record<string, unknown>> | null);
    const quotes = ((request.quotes as Array<Record<string, unknown>> | null) ?? [])
      .map((quote) => ({ id: String(quote.id), revision: Number(quote.revision), tailoringKobo: Number(quote.tailoring_subtotal_kobo), deliveryKobo: Number(quote.delivery_kobo), scope: String(quote.scope), dueDate: String(quote.due_date), status: String(quote.status), expiresAt: String(quote.expires_at) }))
      .sort((a, b) => b.revision - a.revision);
    return {
      id: String(request.id),
      garmentType: String(request.garment_type),
      description: String(request.description),
      budgetKobo: Number(request.budget_kobo),
      neededBy: String(request.needed_by),
      status: String(request.status),
      tailorName: String(tailor?.studio_name ?? "Tailor"),
      images: ((request.request_images as Array<Record<string, unknown>> | null) ?? []).map((image) => ({ id: String(image.id) })),
      quotes,
      order: order ? { id: String(order.id), status: String(order.status), stage: String(order.stage), depositPaidAt: order.deposit_paid_at ? String(order.deposit_paid_at) : null, balancePaidAt: order.balance_paid_at ? String(order.balance_paid_at) : null, reference: String(order.reference) } : null,
      conversationId: conversation ? String(conversation.id) : null,
    };
  });
}

export type ConversationMessage = { id: string; senderId: string; senderName: string; body: string; attachmentPaths: string[]; createdAt: string };

export async function getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  const supabase = await createSupabaseServerClient(); if (!supabase) return [];
  const { data } = await supabase.from("messages").select("id,sender_id,body,attachment_paths,created_at,profiles(display_name)").eq("conversation_id", conversationId).order("created_at", { ascending: true });
  return ((data ?? []) as Array<Record<string, unknown>>).map((message) => ({
    id: String(message.id),
    senderId: String(message.sender_id),
    senderName: String((message.profiles as Record<string, unknown> | null)?.display_name ?? "Member"),
    body: String(message.body),
    attachmentPaths: Array.isArray(message.attachment_paths) ? message.attachment_paths.map(String) : [],
    createdAt: String(message.created_at),
  }));
}

export type AdminConversation = { conversationId: string; garmentType: string; customerName: string; tailorName: string; reference: string; images: { id: string }[] };

// Superadmin oversight mirrors the customer/tailor "Messages" cutover: a conversation
// only needs admin visibility once it's backing a real, paid job (pre-payment negotiation
// stays between the two parties).
export async function getAdminConversations(): Promise<AdminConversation[]> {
  const supabase = await createSupabaseServerClient(); if (!supabase) return [];
  const { data } = await supabase
    .from("orders")
    .select("reference,deposit_paid_at,balance_paid_at,custom_requests(garment_type,conversations(id),request_images(id)),profiles!orders_customer_id_fkey(display_name),tailor_profiles(studio_name)")
    .or("deposit_paid_at.not.is.null,balance_paid_at.not.is.null")
    .order("created_at", { ascending: false });
  return ((data ?? []) as Array<Record<string, unknown>>).flatMap((order) => {
    const request = firstOrNull(order.custom_requests as Record<string, unknown> | Array<Record<string, unknown>> | null);
    const conversation = request ? firstOrNull(request.conversations as Record<string, unknown> | Array<Record<string, unknown>> | null) : null;
    if (!conversation) return [];
    return [{
      conversationId: String(conversation.id),
      garmentType: String(request?.garment_type ?? "Custom piece"),
      customerName: String((order.profiles as Record<string, unknown> | null)?.display_name ?? "Customer"),
      tailorName: String((order.tailor_profiles as Record<string, unknown> | null)?.studio_name ?? "Tailor"),
      reference: String(order.reference),
      images: ((request?.request_images as Array<Record<string, unknown>> | null) ?? []).map((image) => ({ id: String(image.id) })),
    }];
  });
}

export type TailorActiveJob = { id: string; reference: string; title: string; customerName: string; stage: string; status: string; dueDate: string; tryOnReady: boolean };

export async function getTailorActiveJobs(tailorId: string): Promise<TailorActiveJob[]> {
  const supabase = await createSupabaseServerClient(); if (!supabase) return [];
  const { data } = await supabase.from("orders").select("id,reference,stage,status,due_date,try_on_ready,custom_requests(garment_type),profiles!orders_customer_id_fkey(display_name)").eq("tailor_id", tailorId).in("status", ["active", "awaiting_balance", "ready", "shipped"]).order("due_date", { ascending: true });
  return ((data ?? []) as Array<Record<string, unknown>>).map((order) => ({
    id: String(order.id),
    reference: String(order.reference),
    title: String((order.custom_requests as Record<string, unknown> | null)?.garment_type ?? "Custom piece"),
    customerName: String((order.profiles as Record<string, unknown> | null)?.display_name ?? "Customer"),
    stage: String(order.stage),
    status: String(order.status),
    dueDate: String(order.due_date),
    tryOnReady: Boolean(order.try_on_ready),
  }));
}

export type OrderProgressUpdate = { id: string; stage: string; note: string; imagePaths: string[]; createdAt: string };
export type CustomerOrderDetail = {
  id: string;
  reference: string;
  title: string;
  tailorName: string;
  stage: string;
  status: string;
  tailoringSubtotalKobo: number;
  deliveryKobo: number;
  dueDate: string;
  depositPaidAt: string | null;
  balancePaidAt: string | null;
  tryOnReady: boolean;
  progress: OrderProgressUpdate[];
};

export async function getCustomerOrderDetail(orderId: string, customerId: string): Promise<CustomerOrderDetail | null> {
  const supabase = await createSupabaseServerClient(); if (!supabase) return null;
  const { data: order } = await supabase.from("orders").select("id,reference,stage,status,tailoring_subtotal_kobo,delivery_kobo,due_date,deposit_paid_at,balance_paid_at,try_on_ready,custom_requests(garment_type),tailor_profiles(studio_name)").eq("id", orderId).eq("customer_id", customerId).maybeSingle();
  if (!order) return null;
  const { data: progressRows } = await supabase.from("progress_updates").select("id,stage,note,image_paths,created_at").eq("order_id", orderId).eq("customer_visible", true).order("created_at", { ascending: false });
  const request = firstOrNull(order.custom_requests as Record<string, unknown> | Array<Record<string, unknown>> | null);
  const tailor = firstOrNull(order.tailor_profiles as Record<string, unknown> | Array<Record<string, unknown>> | null);
  return {
    id: String(order.id),
    reference: String(order.reference),
    title: String(request?.garment_type ?? "Custom piece"),
    tailorName: String(tailor?.studio_name ?? "Tailor"),
    stage: String(order.stage),
    status: String(order.status),
    tailoringSubtotalKobo: Number(order.tailoring_subtotal_kobo),
    deliveryKobo: Number(order.delivery_kobo),
    dueDate: String(order.due_date),
    depositPaidAt: order.deposit_paid_at ? String(order.deposit_paid_at) : null,
    balancePaidAt: order.balance_paid_at ? String(order.balance_paid_at) : null,
    tryOnReady: Boolean(order.try_on_ready),
    progress: ((progressRows ?? []) as Array<Record<string, unknown>>).map((row) => ({ id: String(row.id), stage: String(row.stage), note: String(row.note), imagePaths: Array.isArray(row.image_paths) ? row.image_paths.map(String) : [], createdAt: String(row.created_at) })),
  };
}
