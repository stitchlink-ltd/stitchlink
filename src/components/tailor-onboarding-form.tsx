"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { completeTailorOnboarding } from "@/app/tailor/onboarding/actions";
import { initialAuthState, type AuthFieldErrors } from "@/lib/auth/rules";

const fields = [
  ["studioName","Studio name","Kemi Atelier"],
  ["city","City","Lagos"],
  ["state","State","Lagos"],
  ["specialties","Specialties","Bridal, womenswear, aso-ebi"],
] as const;

export function TailorOnboardingForm(){const[state,action,pending]=useActionState(completeTailorOnboarding,initialAuthState);return <form action={action} className="mt-8 space-y-5" noValidate><div className="grid gap-5 sm:grid-cols-2">{fields.map(([name,label,placeholder])=><label key={name} className={name==="specialties"?"sm:col-span-2":""}><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">{label}</span><input name={name} required placeholder={placeholder} className="min-h-12 w-full rounded-xl border border-line bg-background px-4 outline-none focus:border-wine"/>{state.fieldErrors?.[name as keyof AuthFieldErrors]?.[0]&&<p className="mt-1 text-xs text-wine">{state.fieldErrors[name as keyof AuthFieldErrors]?.[0]}</p>}</label>)}</div><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">About your work</span><textarea name="bio" required minLength={30} rows={5} placeholder="Describe your approach, experience, and the clients you serve." className="w-full rounded-xl border border-line bg-background p-4 outline-none focus:border-wine"/>{state.fieldErrors?.bio?.[0]&&<p className="mt-1 text-xs text-wine">{state.fieldErrors.bio[0]}</p>}</label>{state.message&&<p className="rounded-xl bg-wine/5 p-3 text-sm text-wine" role="alert">{state.message}</p>}<button disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-wine px-7 text-sm font-semibold text-white disabled:opacity-60">{pending&&<LoaderCircle size={16} className="animate-spin"/>}Create atelier profile</button><p className="text-xs leading-5 text-muted">Your profile remains private until StitchLink completes manual verification.</p></form>}
