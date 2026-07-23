import { PublicShell } from "@/components/public-shell";
import { RequestWizard } from "@/components/request-wizard";

export default async function RequestPage({ searchParams }: PageProps<"/request">) {
  const { tailor } = await searchParams;
  return <PublicShell><section className="paper-grid bg-[#eee6da] px-4 py-12 sm:py-16"><RequestWizard initialTailor={typeof tailor === "string" ? tailor : undefined} /></section></PublicShell>;
}
