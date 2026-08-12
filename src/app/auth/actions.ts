"use server";

import * as Sentry from "@sentry/nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  emailSchema,
  genericAuthError,
  oauthCookieNames,
  signInSchema,
  signUpSchema,
  updateDisplayNameSchema,
  updatePasswordSchema,
  type AuthActionState,
  type PublicRole,
} from "@/lib/auth/rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, postAuthDestination } from "@/data/auth";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors;
}

function captchaMissing(token?: string) {
  return process.env.NODE_ENV === "production" && !token;
}

export async function signIn(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!result.success) return { status: "error", fieldErrors: fieldErrors(result.error) };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return genericAuthError();
  const { error } = await supabase.auth.signInWithPassword({ email: result.data.email, password: result.data.password });
  if (error) {
    Sentry.captureException(error, { tags: { area: "auth_sign_in" }, extra: { email: result.data.email } });
    return genericAuthError();
  }
  const account = await getCurrentUser();
  if (!account) {
    await supabase.auth.signOut({ scope: "local" });
    return { status: "error", message: "Your email is confirmed, but the marketplace profile database has not been set up. Apply the Supabase migrations and try again." };
  }
  if (!account.user.email_confirmed_at) {
    await supabase.auth.signOut({ scope: "local" });
    return { status: "error", message: "Confirm your email before signing in. You can resend the link below." };
  }
  redirect(await postAuthDestination(account, result.data.next));
}

export async function signUp(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    terms: formData.get("terms"),
    next: formData.get("next") || undefined,
    captchaToken: formData.get("cf-turnstile-response") || undefined,
  });
  if (!result.success) return { status: "error", fieldErrors: fieldErrors(result.error) };
  if (captchaMissing(result.data.captchaToken)) {
    return { status: "error", fieldErrors: { captchaToken: ["Complete the security check."] } };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return genericAuthError();
  const callback = new URL("/auth/callback", siteUrl());
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      emailRedirectTo: callback.toString(),
      captchaToken: result.data.captchaToken,
      data: { role: result.data.role, display_name: result.data.fullName, full_name: result.data.fullName },
    },
  });
  if (error) {
    Sentry.captureException(error, { tags: { area: "auth_sign_up" }, extra: { email: result.data.email } });
    return genericAuthError();
  }
  redirect(`/check-email?email=${encodeURIComponent(result.data.email)}`);
}

export async function signInWithGoogle(formData: FormData) {
  const requestedRole = formData.get("role");
  const role: PublicRole = requestedRole === "tailor" ? "tailor" : "customer";
  const requestedNext = typeof formData.get("next") === "string" ? String(formData.get("next")) : "";
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/sign-in?error=configuration");

  const cookieStore = await cookies();
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  cookieStore.set(oauthCookieNames.role, role, options);
  if (requestedNext) cookieStore.set(oauthCookieNames.next, requestedNext, options);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL("/auth/callback", siteUrl()).toString(), skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    if (error) Sentry.captureException(error, { tags: { area: "auth_oauth_google" } });
    redirect("/sign-in?error=oauth");
  }
  redirect(data.url);
}

export async function resendConfirmation(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = emailSchema.safeParse({ email: formData.get("email"), captchaToken: formData.get("cf-turnstile-response") || undefined });
  if (!result.success) return { status: "error", fieldErrors: fieldErrors(result.error) };
  if (captchaMissing(result.data.captchaToken)) return { status: "error", fieldErrors: { captchaToken: ["Complete the security check."] } };
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: result.data.email,
      options: { emailRedirectTo: new URL("/auth/callback", siteUrl()).toString(), captchaToken: result.data.captchaToken },
    });
    if (error) Sentry.captureException(error, { tags: { area: "auth_resend_confirmation" }, extra: { email: result.data.email } });
  }
  return { status: "success", message: "If an account can be confirmed, a new link is on its way." };
}

export async function requestPasswordReset(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = emailSchema.safeParse({ email: formData.get("email"), captchaToken: formData.get("cf-turnstile-response") || undefined });
  if (!result.success) return { status: "error", fieldErrors: fieldErrors(result.error) };
  if (captchaMissing(result.data.captchaToken)) return { status: "error", fieldErrors: { captchaToken: ["Complete the security check."] } };
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const callback = new URL("/auth/callback", siteUrl());
    callback.searchParams.set("next", "/update-password");
    const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, { redirectTo: callback.toString(), captchaToken: result.data.captchaToken });
    if (error) Sentry.captureException(error, { tags: { area: "auth_request_password_reset" }, extra: { email: result.data.email } });
  }
  return { status: "success", message: "If the address is registered, we sent password reset instructions." };
}

export async function updatePassword(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = updatePasswordSchema.safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!result.success) return { status: "error", fieldErrors: fieldErrors(result.error) };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return genericAuthError();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "This recovery link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: result.data.password });
  if (error) {
    Sentry.captureException(error, { tags: { area: "auth_update_password" }, extra: { userId: user.id } });
    return genericAuthError();
  }
  await supabase.auth.signOut({ scope: "global" });
  return { status: "success", message: "Your password has been updated. You can continue securely." };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut({ scope: "local" });
  redirect("/sign-in");
}

export async function updateDisplayName(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = updateDisplayNameSchema.safeParse({ displayName: formData.get("displayName") });
  if (!result.success) return { status: "error", fieldErrors: fieldErrors(result.error) };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return genericAuthError();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return genericAuthError();
  const { error } = await supabase.from("profiles").update({ display_name: result.data.displayName }).eq("id", user.id);
  if (error) {
    Sentry.captureException(error, { tags: { area: "auth_update_display_name" }, extra: { userId: user.id } });
    return genericAuthError();
  }
  revalidatePath("/account");
  return { status: "success", message: "Your name has been updated." };
}

export async function resetAuthenticatorFactor(formData: FormData): Promise<void> {
  const factorId = String(formData.get("factorId") ?? "");
  const supabase = await createSupabaseServerClient();
  if (supabase && factorId) await supabase.auth.mfa.unenroll({ factorId });
  redirect("/mfa");
}
