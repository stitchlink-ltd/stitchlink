import { MessageCircle } from "lucide-react";
import { DashboardHeading, Panel } from "@/components/dashboard-ui";
import { Price } from "@/components/price";
import { requireRole } from "@/data/auth";
import { getTailorRequests } from "@/data/marketplace";
import { QuoteForm } from "@/components/quote-form";
export default async function TailorQuotesPage(){const account=await requireRole("tailor");const requests="demo" in account?[]:await getTailorRequests(account.user.id);return <div className="mx-auto max-w-6xl"><DashboardHeading eyebrow="Requests and negotiation" title="Quotes" description="Only the latest structured revision can be accepted by a customer."/><div className="grid gap-4">{requests.map(request=><Panel key={request.id} className="p-5"><div className="flex gap-3"><span className="grid size-10 place-items-center rounded-full bg-blue/10 text-blue"><MessageCircle size={17}/></span><div className="flex-1"><h2 className="font-semibold">{request.garmentType}</h2><p className="mt-1 text-xs text-muted">{request.customerName} · needed by {request.neededBy}</p><p className="mt-3 text-sm text-muted">{request.description}</p><Price kobo={request.budgetKobo} className="mt-3 block font-semibold"/></div></div><QuoteForm requestId={request.id}/></Panel>)}{!requests.length&&<Panel className="p-8 text-sm text-muted">No quote requests right now.</Panel>}</div></div>}
