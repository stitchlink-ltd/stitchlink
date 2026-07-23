import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, postAuthDestination } from "@/data/auth";
import { oauthCookieNames, sanitizeRecoveryNext } from "@/lib/auth/rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL("/sign-in?error=configuration", request.url));
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const recoveryNext = sanitizeRecoveryNext(request.nextUrl.searchParams.get("next"));

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing authentication token") };
  if (result.error) return NextResponse.redirect(new URL("/sign-in?error=expired-link", request.url));

  if (recoveryNext || type === "recovery") return NextResponse.redirect(new URL("/update-password", request.url));

  const cookieStore = await cookies();
  const selectedRole = cookieStore.get(oauthCookieNames.role)?.value;
  if (selectedRole === "customer" || selectedRole === "tailor") {
    await supabase.rpc("set_initial_oauth_role", { p_role: selectedRole });
  }
  const requestedNext = cookieStore.get(oauthCookieNames.next)?.value;
  cookieStore.delete(oauthCookieNames.role);
  cookieStore.delete(oauthCookieNames.next);

  const account = await getCurrentUser();
  if (!account) return NextResponse.redirect(new URL("/sign-in?error=profile", request.url));
  return NextResponse.redirect(new URL(await postAuthDestination(account, requestedNext), request.url));
}
