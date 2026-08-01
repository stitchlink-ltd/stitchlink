import Link from "next/link";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { resetAuthenticatorFactor } from "@/app/auth/actions";
import { UpdateDisplayNameForm } from "@/components/update-display-name-form";
import { requireAccount } from "@/data/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const account = await requireAccount();

  let mfaFactorId: string | null = null;
  if (account.role === "admin") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.auth.mfa.listFactors();
      mfaFactorId = data?.totp.find((factor) => factor.status === "verified")?.id ?? null;
    }
  }

  return (
    <main className="min-h-screen bg-background p-5 sm:p-10">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-paper p-7 soft-shadow sm:p-10">
        <p className="eyebrow text-wine">Account</p>
        <h1 className="mt-2 font-display text-4xl">Profile & security</h1>
        <dl className="mt-8 grid gap-5 rounded-2xl bg-background p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Name</dt>
            <dd className="mt-1">
              <UpdateDisplayNameForm defaultValue={account.displayName} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Role</dt>
            <dd className="mt-1 font-semibold capitalize">{account.role}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">Email</dt>
            <dd className="mt-1">{account.user.email}</dd>
          </div>
        </dl>

        {account.role === "admin" && (
          <div className="mt-5 rounded-2xl bg-background p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${mfaFactorId ? "bg-sage/10 text-sage" : "bg-wine/10 text-wine"}`}>
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

        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/${account.role}`} className="rounded-full bg-wine px-5 py-3 text-sm font-semibold text-white">Return to workspace</Link>
          <Link href="/forgot-password" className="rounded-full border border-line px-5 py-3 text-sm font-semibold">Reset password</Link>
        </div>
      </section>
    </main>
  );
}
