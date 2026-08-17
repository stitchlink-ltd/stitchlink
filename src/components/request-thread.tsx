"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Send } from "lucide-react";
import { sendMessage } from "@/app/marketplace/actions";
import { marketplaceInitialState } from "@/lib/marketplace-state";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

async function uploadAttachment(file: File) {
  const response = await fetch("/api/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "message", mimeType: file.type, sizeBytes: file.size }) });
  const signed = await response.json();
  if (!response.ok) throw new Error(signed.error ?? "Unable to upload an image.");
  const stored = await fetch(signed.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!stored.ok) throw new Error("Unable to store an image.");
  return signed.path as string;
}

export type ThreadMessage = { id: string; senderId: string; senderName: string; body: string; attachmentPaths: string[]; createdAt: string };

export function RequestThread({ conversationId, currentUserId, messages, readOnly = false }: { conversationId: string; currentUserId: string; messages: ThreadMessage[]; readOnly?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live delivery: refetch (via the server's getConversationMessages, which resolves
  // sender display names correctly) whenever the *other* party posts a message, instead
  // of only updating on the current user's own send. Setup is fully synchronous (no
  // await before .subscribe()), so there's no Strict-Mode double-invoke race to guard.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if ((payload.new as { sender_id?: string }).sender_id !== currentUserId) router.refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, router]);

  function submit() {
    if (!body.trim() && !file) {
      setError("Write a message or attach an image.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const attachments = file ? [await uploadAttachment(file)] : [];
        const formData = new FormData();
        formData.set("conversationId", conversationId);
        formData.set("body", body.trim() || "Shared an image");
        formData.set("attachments", JSON.stringify(attachments));
        const result = await sendMessage(marketplaceInitialState, formData);
        if (result.status === "error") {
          setError(result.message ?? "Unable to send your message.");
          return;
        }
        setBody("");
        setFile(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to send your message.");
      }
    });
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="max-h-72 space-y-3 overflow-y-auto">
        {messages.length === 0 && <p className="text-xs text-muted">No messages yet.</p>}
        {messages.map((message) => {
          const own = message.senderId === currentUserId;
          return (
            <div key={message.id} className={own ? "ml-auto max-w-sm" : "max-w-sm"}>
              <p className={`text-[10px] font-semibold text-muted ${own ? "text-right" : ""}`}>{own ? "You" : message.senderName}</p>
              <div className={`mt-1 rounded-2xl p-3 text-sm leading-6 ${own ? "rounded-tr-sm bg-wine text-white" : "rounded-tl-sm bg-background"}`}>
                {message.body}
                {message.attachmentPaths.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.attachmentPaths.map((path) => {
                      const src = `/api/message-attachments?conversationId=${conversationId}&path=${encodeURIComponent(path)}`;
                      return (
                        <a key={path} href={src} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element -- private image behind a signed-URL redirect route, not a static asset */}
                          <img src={src} alt="Attachment" className="h-20 w-20 rounded-lg object-cover" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!readOnly && (
      <>
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={1}
          placeholder="Write a message…"
          className="flex-1 resize-none rounded-xl border border-line bg-background p-3 text-sm outline-none"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-wine"
          aria-label="Attach image"
        >
          <ImagePlus size={16} />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-wine text-white disabled:opacity-60"
          aria-label="Send message"
        >
          {pending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      {file && <p className="mt-1 text-[11px] text-muted">Attached: {file.name}</p>}
      {error && <p className="mt-1 text-xs text-wine">{error}</p>}
      </>
      )}
    </div>
  );
}
