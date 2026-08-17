import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PendingApplicationDocument = { id: string; documentType: string };

export type PendingTailorApplication = {
  id: string;
  tailorId: string;
  studio: string;
  city: string;
  state: string;
  bio: string;
  specialties: string[];
  startingPriceKobo: number;
  turnaroundMinDays: number;
  turnaroundMaxDays: number;
  displayName: string;
  email: string | null;
  accountStatus: "active" | "suspended";
  documents: PendingApplicationDocument[];
  submittedAt: string | null;
};

async function emailsFor(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, userIds: string[]) {
  const emails = new Map<string, string>();
  await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await admin.auth.admin.getUserById(userId);
      if (data.user?.email) emails.set(userId, data.user.email);
    }),
  );
  return emails;
}

export async function getPendingTailorApplications(): Promise<PendingTailorApplication[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tailor_applications")
    .select(
      "id,tailor_id,submitted_at,tailor_profiles(studio_name,city,state,bio,specialties,starting_price_kobo,turnaround_min_days,turnaround_max_days),profiles(display_name,account_status),verification_documents(id,document_type)",
    )
    .in("status", ["submitted", "in_review"])
    .order("submitted_at", { ascending: true });
  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const admin = createSupabaseAdminClient();
  const emails = admin ? await emailsFor(admin, rows.map((row) => String(row.tailor_id))) : new Map<string, string>();

  return rows.map((application) => {
    const profile = application.tailor_profiles as Record<string, unknown> | null;
    const account = application.profiles as Record<string, unknown> | null;
    const documents = (application.verification_documents as Array<Record<string, unknown>> | null) ?? [];
    const tailorId = String(application.tailor_id);
    return {
      id: String(application.id),
      tailorId,
      studio: String(profile?.studio_name ?? "Unnamed atelier"),
      city: String(profile?.city ?? ""),
      state: String(profile?.state ?? ""),
      bio: String(profile?.bio ?? ""),
      specialties: Array.isArray(profile?.specialties) ? (profile.specialties as unknown[]).map(String) : [],
      startingPriceKobo: Number(profile?.starting_price_kobo ?? 0),
      turnaroundMinDays: Number(profile?.turnaround_min_days ?? 0),
      turnaroundMaxDays: Number(profile?.turnaround_max_days ?? 0),
      displayName: String(account?.display_name ?? "Unnamed"),
      email: emails.get(tailorId) ?? null,
      accountStatus: (account?.account_status as "active" | "suspended") ?? "active",
      documents: documents.map((document) => ({ id: String(document.id), documentType: String(document.document_type) })),
      submittedAt: application.submitted_at ? String(application.submitted_at) : null,
    };
  });
}

export type AdminAccount = {
  id: string;
  displayName: string;
  email: string | null;
  role: "customer" | "tailor" | "admin";
  accountStatus: "active" | "suspended";
  suspendedReason: string | null;
  createdAt: string;
};

export async function getAllAccounts(): Promise<AdminAccount[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id,display_name,role,account_status,suspended_reason,created_at")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const admin = createSupabaseAdminClient();
  const emails = admin ? await emailsFor(admin, rows.map((row) => String(row.id))) : new Map<string, string>();

  return rows.map((row) => ({
    id: String(row.id),
    displayName: String(row.display_name || "Unnamed"),
    email: emails.get(String(row.id)) ?? null,
    role: row.role as AdminAccount["role"],
    accountStatus: row.account_status as AdminAccount["accountStatus"],
    suspendedReason: row.suspended_reason ? String(row.suspended_reason) : null,
    createdAt: String(row.created_at),
  }));
}
