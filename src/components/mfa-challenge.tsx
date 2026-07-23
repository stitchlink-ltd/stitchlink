"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Enrollment = { id: string; qrCode: string; secret: string };

export function MfaChallenge() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string>();
  const [enrollment, setEnrollment] = useState<Enrollment>();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("Preparing secure verification…");
  const [pending, setPending] = useState(true);

  const prepare = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage("Authentication is unavailable. Contact the marketplace owner."); setPending(false); return; }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") { router.replace("/admin"); router.refresh(); return; }
    const { data: factors, error } = await supabase.auth.mfa.listFactors();
    if (error) { setMessage("We could not load your security factors."); setPending(false); return; }
    const verified = factors.totp.find((factor) => factor.status === "verified");
    if (verified) { setFactorId(verified.id); setMessage("Enter the current six-digit code from your authenticator app."); setPending(false); return; }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "StitchLink Admin" });
    if (enrollError) { setMessage("We could not start authenticator enrollment."); setPending(false); return; }
    setFactorId(data.id);
    setEnrollment({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setMessage("Scan this code with your authenticator app, then enter its six-digit code.");
    setPending(false);
  }, [router]);

  useEffect(() => { const timer=window.setTimeout(()=>void prepare(),0);return()=>window.clearTimeout(timer); }, [prepare]);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) { setMessage("Enter a valid six-digit code."); return; }
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage("Authentication is unavailable."); setPending(false); return; }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) { setMessage("That code could not be verified. Wait for a new code and try again."); setPending(false); return; }
    router.replace("/admin");
    router.refresh();
  }

  return <div className="mt-7"><p className="text-sm leading-6 text-muted" aria-live="polite">{message}</p>{pending&&<LoaderCircle className="mx-auto mt-5 animate-spin text-wine" aria-label="Loading"/>}{enrollment&&<div className="mt-5"><Image unoptimized src={enrollment.qrCode} width={192} height={192} alt="Authenticator enrollment QR code" className="mx-auto size-48 rounded-xl border border-line bg-white p-2"/><details className="mt-3 text-left text-xs text-muted"><summary className="cursor-pointer font-semibold text-wine">Can’t scan the code?</summary><p className="mt-2 break-all rounded-lg bg-background p-3 font-mono">{enrollment.secret}</p></details></div>}{factorId&&!pending&&<form onSubmit={verify} className="mt-5"><label className="block text-left"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">Six-digit code</span><input value={code} onChange={(event)=>setCode(event.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required className="min-h-12 w-full rounded-xl border border-line bg-background px-4 text-center font-mono text-xl tracking-[.4em] outline-none focus:border-wine"/></label><button className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-wine px-5 text-sm font-semibold text-white"><ShieldCheck size={16}/>Verify and continue</button></form>}</div>;
}
