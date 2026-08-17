import { NextResponse } from "next/server";
import { requireRole } from "@/data/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const account = await requireRole("admin");
  const { documentId } = await params;
  if ("demo" in account) return NextResponse.json({ error: "Documents are not available in demo mode" }, { status: 404 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });

  const { data: document } = await admin.from("verification_documents").select("storage_path").eq("id", documentId).maybeSingle();
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { data: signed, error } = await admin.storage.from("verification").createSignedUrl(document.storage_path, 300);
  if (error || !signed) return NextResponse.json({ error: "Unable to load document" }, { status: 500 });

  return NextResponse.redirect(signed.signedUrl);
}
