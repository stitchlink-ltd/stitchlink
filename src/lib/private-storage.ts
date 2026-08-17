import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function signObject(bucket: string, path: string, expiresInSeconds = 300) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
