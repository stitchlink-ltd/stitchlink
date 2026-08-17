import { z } from "zod";
import { getTryOnProvider } from "@/lib/try-on/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const schema = z.object({
  orderId: z.uuid(),
  personImagePath: z.string().min(3).max(500),
  garmentImagePath: z.string().min(3).max(500),
  consent: z.literal(true),
});
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Valid images and consent are required" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return Response.json({ error: "Try-on storage is not configured" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("id", parsed.data.orderId)
    .eq("customer_id", user.id)
    .single();
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  const { data: job, error } = await supabase
    .from("try_on_jobs")
    .insert({
      order_id: order.id,
      customer_id: user.id,
      person_image_path: parsed.data.personImagePath,
      garment_image_path: parsed.data.garmentImagePath,
      consented_at: new Date().toISOString(),
      status: "processing",
    })
    .select("id")
    .single();
  if (error || !job)
    return Response.json({ error: "Unable to create preview job" }, { status: 500 });
  const result = await getTryOnProvider().createPreview({
    orderId: order.id,
    personImagePath: parsed.data.personImagePath,
    garmentImagePath: parsed.data.garmentImagePath,
  });
  await supabase
    .from("try_on_jobs")
    .update({
      provider_job_id: result.providerJobId,
      status: result.status,
      preview_path: result.previewPath,
    })
    .eq("id", job.id);
  return Response.json({ id: job.id, ...result }, { status: 202 });
}
