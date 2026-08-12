import Link from "next/link";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { resetAuthenticatorFactor } from "@/app/auth/actions";
import { GoogleCalendarConnect } from "@/components/google-calendar-connect";
import { PushOptIn } from "@/components/push-opt-in";
import { UpdateDisplayNameForm } from "@/components/update-display-name-form";
import { requireAccountOrDemo } from "@/data/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const account = await requireAccountOrDemo();
  const isDemo = "demo" in account;

  let mfaFactorId: string | null = null;
  let calendarStatus = { connected: false, google_email: null as string | null, sync_milestones: false };
  if (!isDemo) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      if (account.role === "admin") {
        const { data } = await supabase.auth.mfa.listFactors();
        mfaFactorId = data?.totp.find((factor) => factor.status === "verified")?.id ?? null;
      }
      const { data: connection } = await supabase.rpc("google_calendar_connection_status").maybeSingle();
      if (connection) calendarStatus = connection as typeof calendarStatus;
    }
  }

  return (
    <main className="min-h-screen bg-background p-5 sm:p-10">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-paper p-7 soft-shadow sm:p-10">
        <p className="eyebrow text-wine">Account</p>
        <h1 className="mt-2 font-display text-4xl">Profile & security</h1>
        {isDemo && (
          <p className="mt-3 rounded-xl bg-background px-4 py-3 text-xs leading-5 text-muted">
            You&apos;re viewing a demo account. Profile and security changes are disabled here — sign up for a real StitchLink account to manage these.
          </p>
        )}
        <dl className="mt-8 grid gap-5 rounded-2xl bg-background p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Name</dt>
            <dd className="mt-1">
              {isDemo ? (
                <p className="flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-semibold">{account.displayName}</p>
              ) : (
                <UpdateDisplayNameForm defaultValue={account.displayName} />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Role</dt>
            <dd className="mt-1 font-semibold capitalize">{account.role}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Email</dt>
            <dd className="mt-1">{isDemo ? "Not applicable in demo mode" : account.user.email}</dd>
          </div>
        </dl>

        {!isDemo && account.role === "admin" && (
          <div className="mt-5 rounded-2xl bg-background p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${mfaFactorId ? "bg-sage/10 text-sage" : "bg-blue/10 text-blue"}`}>
                  {mfaFactorId ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Authenticator app</p>
                  <p className="mt-1 font-semibold">{mfaFactorId ? "Connected" : "Not set up"}</p>
                </div>
              </div>
              {mfaFactorId ? (
                <form action={resetAuthenticatorFactor}>
                  <input type="hidden" name="factorId" value={mfaFactorId} />
                  <button className="rounded-full border border-line px-4 py-2 text-xs font-semibold">Reset authenticator</button>
                </form>
              ) : (
                <Link href="/mfa" className="rounded-full border border-line px-4 py-2 text-xs font-semibold">Set up</Link>
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              {mfaFactorId
                ? "Lost your device? Resetting removes this authenticator so you can enroll a new one on your next sign-in."
                : "Required for admin access. You'll be prompted to enroll on your next sign-in."}
            </p>
          </div>
        )}

        {!isDemo && <PushOptIn />}
        {!isDemo && (
          <GoogleCalendarConnect connected={calendarStatus.connected} googleEmail={calendarStatus.google_email} syncMilestones={calendarStatus.sync_milestones} />
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/${account.role}`} className="rounded-full bg-wine px-5 py-3 text-sm font-semibold text-white">Return to workspace</Link>
          {!isDemo && <Link href="/forgot-password" className="rounded-full border border-line px-5 py-3 text-sm font-semibold">Reset password</Link>}
        </div>
      </section>
    </main>
  );
}
