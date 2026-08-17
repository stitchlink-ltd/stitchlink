import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signObject } from "@/lib/private-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { data: image } = await supabase.from("request_images").select("storage_path").eq("id", imageId).maybeSingle();
  if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });

  const signedUrl = await signObject("marketplace-private", image.storage_path);
  if (!signedUrl) return NextResponse.json({ error: "Unable to load image" }, { status: 500 });
  return NextResponse.redirect(signedUrl);
}
