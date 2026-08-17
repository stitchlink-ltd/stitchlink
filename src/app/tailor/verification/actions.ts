"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/data/auth";
import type { MarketplaceActionState } from "@/lib/marketplace-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const documentSchema = z.object({
  documentType: z.enum(["government_id", "address_proof", "bank_proof", "portfolio_ownership"]),
  path: z.string().max(500),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});
const schema = z.object({ applicationId: z.uuid(), documents: z.array(documentSchema).min(1) });

export async function submitTailorApplication(
  applicationId: string,
  documents: Array<{ documentType: string; path: string; mimeType: string; sizeBytes: number }>,
): Promise<MarketplaceActionState> {
  const parsed = schema.safeParse({ applicationId, documents });
  if (!parsed.success) return { status: "error", message: "Upload all required documents before submitting." };
  try {
    const account = await requireRole("tailor");
    if ("demo" in account) return { status: "success", message: "Demo application submitted." };
    const supabase = await createSupabaseServerClient();
    if (!supabase) throw new Error("Verification is temporarily unavailable.");
    for (const document of parsed.data.documents) {
      const { error } = await supabase.from("verification_documents").insert({
        application_id: parsed.data.applicationId,
        document_type: document.documentType,
        storage_path: document.path,
        mime_type: document.mimeType,
        size_bytes: document.sizeBytes,
      });
      if (error) throw new Error(error.message);
    }
    const { error } = await supabase.rpc("submit_tailor_application", { p_application_id: parsed.data.applicationId });
    if (error) throw new Error(error.message);
    revalidatePath("/tailor/verification");
    revalidatePath("/admin/verification");
    return { status: "success", message: "Your documents were submitted for review." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "We could not submit your application." };
  }
}
