import { PublicShell } from "@/components/public-shell";
import { RequestWizard } from "@/components/request-wizard";
import { getPublishedTailors } from "@/data/marketplace";

export default async function RequestPage({ searchParams }: PageProps<"/request">) {
  const { tailor } = await searchParams;
  const tailors = await getPublishedTailors();
  return <PublicShell><section className="paper-grid bg-background px-4 py-12 sm:py-16"><RequestWizard initialTailor={typeof tailor === "string" ? tailor : undefined} tailors={tailors} /></section></PublicShell>;
}
