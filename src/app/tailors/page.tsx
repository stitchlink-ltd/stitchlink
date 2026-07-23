import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { TailorDirectory } from "@/components/tailor-directory";
import { tailors } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Find a tailor", description: "Explore verified Nigerian tailors by specialty, grade and availability." };

export default function TailorsPage() {
  return (
    <PublicShell>
      <section className="border-b border-line bg-[#eee6da] py-16">
        <div className="container-shell"><p className="eyebrow text-wine">The StitchLink directory</p><h1 className="mt-3 max-w-3xl font-display text-5xl leading-none sm:text-6xl">Find the right hands for your idea.</h1><p className="mt-5 max-w-2xl leading-7 text-muted">Compare portfolios, service history, verified reviews and current workload before you begin a conversation.</p></div>
      </section>
      <section className="container-shell py-10"><TailorDirectory items={tailors} /></section>
    </PublicShell>
  );
}
