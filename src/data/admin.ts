import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PendingTailorApplication = {
  id: string;
  tailorId: string;
  studio: string;
  location: string;
  documentCount: number;
  submittedAt: string | null;
};

export async function getPendingTailorApplications(): Promise<PendingTailorApplication[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tailor_applications")
    .select("id,tailor_id,submitted_at,tailor_profiles(studio_name,city,state),verification_documents(id)")
    .in("status", ["submitted", "in_review"])
    .order("submitted_at", { ascending: true });
  return ((data ?? []) as Array<Record<string, unknown>>).map((application) => {
    const profile = application.tailor_profiles as Record<string, unknown> | null;
    const documents = (application.verification_documents as unknown[] | null) ?? [];
    return {
      id: String(application.id),
      tailorId: String(application.tailor_id),
      studio: String(profile?.studio_name ?? "Unnamed atelier"),
      location: [profile?.city, profile?.state].filter(Boolean).join(", "),
      documentCount: documents.length,
      submittedAt: application.submitted_at ? String(application.submitted_at) : null,
    };
  });
}
