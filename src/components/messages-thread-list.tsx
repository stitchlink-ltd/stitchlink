"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RequestImageViewer } from "./request-image-viewer";
import { RequestThread, type ThreadMessage } from "./request-thread";

export type MessageConversation = {
  conversationId: string;
  title: string;
  subtitle: string;
  reference: string;
  images: { id: string }[];
  messages: ThreadMessage[];
};

export function MessagesThreadList({
  conversations,
  currentUserId,
  readOnly = false,
}: {
  conversations: MessageConversation[];
  currentUserId: string;
  readOnly?: boolean;
}) {
  const [activeId, setActiveId] = useState(conversations[0].conversationId);
  const active = conversations.find((conversation) => conversation.conversationId === activeId) ?? conversations[0];

  return (
    <div className="grid gap-5 rounded-2xl border border-line bg-paper p-5 md:grid-cols-[240px_1fr]">
      <div className="space-y-2 border-b border-line pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-5">
        {conversations.map((conversation) => {
          const last = conversation.messages[conversation.messages.length - 1];
          return (
            <button
              key={conversation.conversationId}
              onClick={() => setActiveId(conversation.conversationId)}
              className={cn(
                "w-full rounded-xl p-3 text-left text-sm",
                conversation.conversationId === active.conversationId ? "bg-background" : "hover:bg-background"
              )}
            >
              <strong>{conversation.title}</strong>
              <p className="mt-1 truncate text-xs text-muted">{last ? last.body : "No messages yet"}</p>
            </button>
          );
        })}
      </div>
      <div className="min-w-0">
        <div className="border-b border-line pb-4">
          <p className="font-semibold">{active.title}</p>
          <p className="text-[11px] text-muted">{active.subtitle} · Order {active.reference}</p>
          <RequestImageViewer images={active.images} />
        </div>
        <RequestThread conversationId={active.conversationId} currentUserId={currentUserId} messages={active.messages} readOnly={readOnly} />
      </div>
    </div>
  );
}
