import { DashboardHeading, Panel } from "@/components/dashboard-ui";
import { MessagesThreadList } from "@/components/messages-thread-list";
import { requireRole } from "@/data/auth";
import { getAdminConversations, getConversationMessages, type ConversationMessage } from "@/data/marketplace";

export default async function AdminMessagesPage() {
  const account = await requireRole("admin");
  const isDemo = "demo" in account;
  const conversations = isDemo ? [] : await getAdminConversations();

  const threadEntries = await Promise.all(
    conversations.map(async (conversation) => [conversation.conversationId, await getConversationMessages(conversation.conversationId)] as const)
  );
  const threads = new Map<string, ConversationMessage[]>(threadEntries);

  const threadConversations = conversations.map((conversation) => ({
    conversationId: conversation.conversationId,
    title: `${conversation.customerName} × ${conversation.tailorName}`,
    subtitle: conversation.garmentType,
    reference: conversation.reference,
    images: conversation.images,
    messages: threads.get(conversation.conversationId) ?? [],
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading
        eyebrow="Oversight"
        title="Messages"
        description="Read-only view of every conversation behind a paid order, for support and dispute review."
      />
      {threadConversations.length > 0 ? (
        <MessagesThreadList conversations={threadConversations} currentUserId="" readOnly />
      ) : (
        <Panel className="p-8 text-sm text-muted">No paid-order conversations yet.</Panel>
      )}
    </div>
  );
}
