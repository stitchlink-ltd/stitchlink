import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { MfaChallenge } from "@/components/mfa-challenge";
import { postAuthDestination, requireAccount } from "@/data/auth";
export default async function MfaPage() {
  const account = await requireAccount();
  if (!account) redirect("/sign-in?next=/admin");
  if (account.role !== "admin") redirect(await postAuthDestination(account));
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <div className="w-full max-w-md rounded-[2rem] border border-line bg-paper p-7 text-center soft-shadow sm:p-9">
        <div className="flex justify-center">
          <Logo />
        </div>
        <span className="mx-auto mt-8 grid size-14 place-items-center rounded-full bg-blue/10 text-blue">
          <ShieldCheck />
        </span>
        <h1 className="mt-5 font-display text-3xl">Admin verification required</h1>
        <MfaChallenge />
      </div>
    </main>
  );
}
