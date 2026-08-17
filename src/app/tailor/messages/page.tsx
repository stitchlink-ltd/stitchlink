import { DashboardHeading, Panel } from "@/components/dashboard-ui";
import { MessagesThreadList } from "@/components/messages-thread-list";
import { requireRole } from "@/data/auth";
import {
  getConversationMessages,
  getTailorRequests,
  type ConversationMessage,
} from "@/data/marketplace";

export default async function TailorMessagesPage() {
  const account = await requireRole("tailor");
  const isDemo = "demo" in account;
  const requests = isDemo ? [] : await getTailorRequests(account.user.id);
  const currentUserId = isDemo ? "" : account.user.id;

  const paidRequests = requests.filter(
    (request) =>
      request.conversationId &&
      request.order &&
      (request.order.depositPaidAt || request.order.balancePaidAt)
  );

  const threadEntries = await Promise.all(
    paidRequests.map(
      async (request) =>
        [
          request.conversationId as string,
          await getConversationMessages(request.conversationId as string),
        ] as const
    )
  );
  const threads = new Map<string, ConversationMessage[]>(threadEntries);

  const conversations = paidRequests.map((request) => ({
    conversationId: request.conversationId as string,
    title: request.customerName,
    subtitle: request.garmentType,
    reference: request.order!.reference,
    images: request.images,
    messages: threads.get(request.conversationId as string) ?? [],
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading
        eyebrow="Private conversations"
        title="Messages"
        description="Client conversations move here once they accept your quote and pay for the order."
      />
      {conversations.length > 0 ? (
        <MessagesThreadList conversations={conversations} currentUserId={currentUserId} />
      ) : (
        <Panel className="p-8 text-sm text-muted">
          No conversations yet. Once a client pays for an order, its thread appears here.
        </Panel>
      )}
    </div>
  );
}
