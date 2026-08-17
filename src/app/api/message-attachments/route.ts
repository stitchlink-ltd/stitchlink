import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signObject } from "@/lib/private-storage";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  const path = url.searchParams.get("path");
  if (!conversationId || !path)
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  // RLS (messages_member_read) already scopes this select to conversation members;
  // the .contains() check additionally proves the path was actually attached to a
  // real message in this conversation, not just any string the caller supplies.
  const { data: message } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .contains("attachment_paths", [path])
    .limit(1)
    .maybeSingle();
  if (!message) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

  const signedUrl = await signObject("marketplace-private", path);
  if (!signedUrl) return NextResponse.json({ error: "Unable to load attachment" }, { status: 500 });
  return NextResponse.redirect(signedUrl);
}
