"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import { SectionPlaceholder } from "@/components/section-placeholder";
import { threads, useMessages } from "@/lib/mock-messages";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const { messages, addMessage } = useMessages();
  const [activeThreadId, setActiveThreadId] = useState(threads[0].id);
  const [draft, setDraft] = useState("");
  const activeThread = threads.find((thread) => thread.id === activeThreadId)!;
  const threadMessages = messages.filter((message) => message.threadId === activeThreadId);

  function send() {
    if (!draft.trim()) return;
    addMessage({ threadId: activeThreadId, from: "customer", author: "You", text: draft.trim() });
    setDraft("");
  }

  return (
    <SectionPlaceholder
      eyebrow="Private conversations"
      title="Messages"
      description="Negotiation and production conversations stay attached to each request."
    >
      <div className="grid min-h-[520px] gap-5 md:grid-cols-[240px_1fr]">
        <div className="space-y-2 border-b border-line pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-5">
          {threads.map((thread) => {
            const last = [...messages].reverse().find((message) => message.threadId === thread.id);
            return (
              <button
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className={cn(
                  "w-full rounded-xl p-3 text-left text-sm",
                  thread.id === activeThreadId ? "bg-background" : "hover:bg-background"
                )}
              >
                <strong>{thread.name}</strong>
                <p className="mt-1 truncate text-xs text-muted">
                  {last ? last.text : "No messages yet"}
                </p>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col">
          <div className="border-b border-line pb-4">
            <p className="font-semibold">{activeThread.name}</p>
            {activeThread.subtitle && <p className="text-[11px] text-sage">Active now · {activeThread.subtitle}</p>}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto py-5">
            {threadMessages.map((message) => (
              <p
                key={message.id}
                className={cn(
                  "max-w-sm rounded-2xl p-3 text-sm leading-6",
                  message.from === "customer"
                    ? "ml-auto rounded-tr-sm bg-wine text-white"
                    : "rounded-tl-sm bg-background"
                )}
              >
                {message.text}
              </p>
            ))}
            {threadMessages.length === 0 && (
              <p className="text-xs text-muted">No messages in this thread yet.</p>
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-11 flex-1 rounded-full border border-line bg-background px-4 text-sm outline-none"
              placeholder="Write a message…"
            />
            <button type="submit" className="grid size-11 place-items-center rounded-full bg-wine text-white" aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </SectionPlaceholder>
  );
}
