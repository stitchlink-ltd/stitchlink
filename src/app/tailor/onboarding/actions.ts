"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/data/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/lib/auth/rules";

const schema = z.object({
  studioName: z.string().trim().min(2, "Enter your studio name.").max(100),
  bio: z.string().trim().min(30, "Tell customers a little more about your work.").max(1200),
  city: z.string().trim().min(2, "Enter your city.").max(80),
  state: z.string().trim().min(2, "Enter your state.").max(80),
  specialties: z.string().trim().min(2, "Add at least one specialty.").max(300),
});

export async function completeTailorOnboarding(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { status: "error", fieldErrors: result.error.flatten().fieldErrors };
  const account = await requireRole("tailor");
  if ("demo" in account) redirect("/tailor");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Onboarding is temporarily unavailable." };
  const base = result.data.studioName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50) || "atelier";
  const slug = `${base}-${account.user.id.slice(0,8)}`;
  const { error } = await supabase.from("tailor_profiles").insert({
    user_id: account.user.id,
    slug,
    studio_name: result.data.studioName,
    bio: result.data.bio,
    city: result.data.city,
    state: result.data.state,
    specialties: result.data.specialties.split(",").map((item)=>item.trim()).filter(Boolean).slice(0,12),
  });
  if (error && error.code !== "23505") return { status: "error", message: "We could not save your atelier. Please try again." };
  redirect("/tailor");
}
