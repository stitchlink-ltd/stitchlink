import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoModeEnabled, roleHome, sanitizeNextPath, type AppRole } from "@/lib/auth/rules";

export type CurrentAccount = {
  user: User;
  role: AppRole;
  displayName: string;
  tailorOnboarded: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentAccount | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role,display_name,email_verified_at")
    .eq("id", user.id)
    .single();
  const role = profile?.role;
  if (error || (role !== "customer" && role !== "tailor" && role !== "admin")) return null;

  let tailorOnboarded = false;
  if (role === "tailor") {
    const { data } = await supabase.from("tailor_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
    tailorOnboarded = Boolean(data);
  }

  return {
    user,
    role,
    displayName: String(profile.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Member"),
    tailorOnboarded,
  };
});

export async function postAuthDestination(account: CurrentAccount, requestedNext?: string | null) {
  return sanitizeNextPath(requestedNext, account.role) ?? roleHome(account.role, account.tailorOnboarded);
}

export async function requireAccount() {
  const account = await getCurrentUser();
  if (!account) redirect("/sign-in");
  if (!account.user.email_confirmed_at) redirect(`/check-email?email=${encodeURIComponent(account.user.email ?? "")}`);
  return account;
}

export async function requireRole(expected: AppRole) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    if (isDemoModeEnabled(process.env.NODE_ENV, process.env.DEMO_MODE)) {
      const labels = { customer: "Nneka Okafor", tailor: "Kola Adeyemi", admin: "Dami Bello" };
      return { demo: true as const, role: expected, displayName: labels[expected], tailorOnboarded: true };
    }
    redirect("/sign-in?error=configuration");
  }

  const account = await requireAccount();
  if (account.role !== expected) redirect(await postAuthDestination(account));
  if (expected === "admin") {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || data.currentLevel !== "aal2") redirect("/mfa");
  }
  return account;
}
