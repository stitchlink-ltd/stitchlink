import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { Price } from "@/components/price";
import { CheckoutButton } from "@/components/checkout-button";
import { AcceptQuoteButton } from "@/components/accept-quote-button";
import { RequestImageViewer } from "@/components/request-image-viewer";
import { RequestThread } from "@/components/request-thread";
import { requireRole } from "@/data/auth";
import { getConversationMessages, getCustomerRequests, type ConversationMessage } from "@/data/marketplace";

export default async function CustomerRequestsPage() {
  const account = await requireRole("customer");
  const isDemo = "demo" in account;
  const allRequests = isDemo ? [] : await getCustomerRequests(account.user.id);
  const currentUserId = isDemo ? "" : account.user.id;

  // Once an order is paid, its conversation moves to the Messages page.
  const requests = allRequests.filter((request) => !(request.order && (request.order.depositPaidAt || request.order.balancePaidAt)));

  const conversationIds = requests.map((request) => request.conversationId).filter((id): id is string => Boolean(id));
  const threadEntries = await Promise.all(conversationIds.map(async (id) => [id, await getConversationMessages(id)] as const));
  const threads = new Map<string, ConversationMessage[]>(threadEntries);

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading
        eyebrow="Requests and negotiation"
        title="My requests"
        description="Message your tailor, review quotes, and accept when you're ready."
      />
      <div className="grid gap-4">
        {requests.map((request) => {
          const order = request.order;
          return (
            <Panel key={request.id} className="p-5">
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue/10 text-blue">
                  <MessageCircle size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{request.garmentType}</h2>
                    <StatusPill tone={request.status === "accepted" ? "green" : "gold"}>{request.status}</StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-muted">{request.tailorName} · needed by {request.neededBy}</p>
                  <p className="mt-3 text-sm text-muted">{request.description}</p>
                  <Price kobo={request.budgetKobo} className="mt-3 block font-semibold" />
                  <RequestImageViewer images={request.images} />
                </div>
              </div>

              {request.quotes.length > 0 && (
                <div className="mt-5 space-y-3 border-t border-line pt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Quotes received</p>
                  {request.quotes.map((quote) => {
                    const expired = new Date(quote.expiresAt) <= new Date();
                    return (
                      <div key={quote.id} className="rounded-xl border border-line p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">Revision {quote.revision}</p>
                          <StatusPill tone={quote.status === "accepted" ? "green" : quote.status === "sent" ? "gold" : "gray"}>{quote.status}</StatusPill>
                        </div>
                        <p className="mt-2 text-muted">{quote.scope}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-4">
                          <Price kobo={quote.tailoringKobo + quote.deliveryKobo} className="font-semibold" />
                          <span className="text-xs text-muted">Due {quote.dueDate}</span>
                        </div>
                        {quote.status === "sent" && !order && (
                          <div className="mt-3">
                            {expired ? <p className="text-xs text-muted">This quote has expired.</p> : <AcceptQuoteButton quoteId={quote.id} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {order && (
                <div className="mt-5 max-w-xs border-t border-line pt-5">
                  <CheckoutButton orderId={order.id} />
                </div>
              )}

              {request.conversationId && (
                <RequestThread
                  conversationId={request.conversationId}
                  currentUserId={currentUserId}
                  messages={threads.get(request.conversationId) ?? []}
                />
              )}
            </Panel>
          );
        })}
        {!requests.length && (
          <Panel className="p-8 text-sm text-muted">
            No requests yet. <Link href="/request" className="font-semibold text-wine">Start a request</Link>
          </Panel>
        )}
      </div>
    </div>
  );
}
