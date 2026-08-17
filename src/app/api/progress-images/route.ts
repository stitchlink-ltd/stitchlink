import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signObject } from "@/lib/private-storage";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  const path = url.searchParams.get("path");
  if (!orderId || !path) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  // RLS (progress_party_read via is_order_party) already scopes this select to the
  // order's customer/tailor; .contains() additionally proves the path was actually
  // attached to a real progress update on this order.
  const { data: update } = await supabase
    .from("progress_updates")
    .select("id")
    .eq("order_id", orderId)
    .contains("image_paths", [path])
    .limit(1)
    .maybeSingle();
  if (!update) return NextResponse.json({ error: "Image not found" }, { status: 404 });

  const signedUrl = await signObject("marketplace-private", path);
  if (!signedUrl) return NextResponse.json({ error: "Unable to load image" }, { status: 500 });
  return NextResponse.redirect(signedUrl);
}
