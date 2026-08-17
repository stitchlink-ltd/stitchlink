import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type VerificationStatus = "draft" | "submitted" | "in_review" | "approved" | "rejected" | "expired";

export type OwnTailorVerification = {
  studioName: string;
  applicationId: string | null;
  applicationStatus: VerificationStatus | null;
  decisionReason: string | null;
  decidedAt: string | null;
  uploadedDocumentTypes: string[];
  grade: 1 | 2 | 3 | 4 | 5;
  completedJobs: number;
  averageRating: number;
  onTimeRate: number;
  cancellationRate: number;
  lostDisputeRate: number;
};

export async function getOwnTailorVerification(userId: string): Promise<OwnTailorVerification | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("tailor_profiles")
    .select("studio_name,grade,completed_job_count,average_rating,on_time_rate,cancellation_rate,lost_dispute_rate")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) return null;

  const { data: application } = await supabase
    .from("tailor_applications")
    .select("id,status,decision_reason,decided_at")
    .eq("tailor_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let uploadedDocumentTypes: string[] = [];
  if (application) {
    const { data: documents } = await supabase.from("verification_documents").select("document_type").eq("application_id", application.id);
    uploadedDocumentTypes = Array.from(new Set((documents ?? []).map((row) => String(row.document_type))));
  }

  return {
    studioName: String(profile.studio_name),
    applicationId: application?.id ?? null,
    applicationStatus: (application?.status as VerificationStatus) ?? null,
    decisionReason: application?.decision_reason ?? null,
    decidedAt: application?.decided_at ?? null,
    uploadedDocumentTypes,
    grade: Number(profile.grade) as 1 | 2 | 3 | 4 | 5,
    completedJobs: Number(profile.completed_job_count),
    averageRating: Number(profile.average_rating),
    onTimeRate: Number(profile.on_time_rate),
    cancellationRate: Number(profile.cancellation_rate),
    lostDisputeRate: Number(profile.lost_dispute_rate),
  };
}
