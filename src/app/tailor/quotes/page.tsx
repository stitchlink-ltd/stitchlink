import { MessageCircle } from "lucide-react";
import { DashboardHeading, Panel } from "@/components/dashboard-ui";
import { Price } from "@/components/price";
import { requireRole } from "@/data/auth";
import { getConversationMessages, getTailorRequests, type ConversationMessage } from "@/data/marketplace";
import { QuoteForm } from "@/components/quote-form";
import { RequestImageViewer } from "@/components/request-image-viewer";
import { RequestThread } from "@/components/request-thread";

export default async function TailorQuotesPage() {
  const account = await requireRole("tailor");
  const isDemo = "demo" in account;
  const allRequests = isDemo ? [] : await getTailorRequests(account.user.id);
  const currentUserId = isDemo ? "" : account.user.id;

  // Once an order is paid, its conversation moves to the Messages page.
  const requests = allRequests.filter((request) => !(request.order && (request.order.depositPaidAt || request.order.balancePaidAt)));

  const conversationIds = requests.map((request) => request.conversationId).filter((id): id is string => Boolean(id));
  const threadEntries = await Promise.all(conversationIds.map(async (id) => [id, await getConversationMessages(id)] as const));
  const threads = new Map<string, ConversationMessage[]>(threadEntries);

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading eyebrow="Requests and negotiation" title="Quotes" description="Only the latest structured revision can be accepted by a customer." />
      <div className="grid gap-4">
        {requests.map((request) => (
          <Panel key={request.id} className="p-5">
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue/10 text-blue">
                <MessageCircle size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{request.garmentType}</h2>
                <p className="mt-1 text-xs text-muted">{request.customerName} · needed by {request.neededBy}</p>
                <p className="mt-3 text-sm text-muted">{request.description}</p>
                <Price kobo={request.budgetKobo} className="mt-3 block font-semibold" />
                <RequestImageViewer images={request.images} />
              </div>
            </div>
            {!request.order && <QuoteForm requestId={request.id} />}
            {request.order && (
              <p className="mt-5 border-t border-line pt-5 text-xs font-semibold text-sage">
                Quote accepted — order {request.order.reference} is awaiting payment.
              </p>
            )}
            {request.conversationId && (
              <RequestThread
                conversationId={request.conversationId}
                currentUserId={currentUserId}
                messages={threads.get(request.conversationId) ?? []}
              />
            )}
          </Panel>
        ))}
        {!requests.length && <Panel className="p-8 text-sm text-muted">No quote requests right now.</Panel>}
      </div>
    </div>
  );
}
