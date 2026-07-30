import { LockKeyhole } from "lucide-react";
import { Logo } from "@/components/logo";
import { UpdatePasswordForm } from "@/components/auth-message-form";
export default function UpdatePasswordPage(){return <main className="grid min-h-screen place-items-center bg-background p-5"><div className="w-full max-w-md rounded-[2rem] border border-line bg-paper p-7 text-center soft-shadow sm:p-9"><div className="flex justify-center"><Logo/></div><span className="mx-auto mt-8 grid size-14 place-items-center rounded-full bg-wine/10 text-wine"><LockKeyhole/></span><h1 className="mt-5 font-display text-3xl">Choose a new password</h1><p className="mt-3 text-sm leading-6 text-muted">Use at least 10 characters. Updating it signs out your other StitchLink sessions.</p><UpdatePasswordForm/></div></main>}
