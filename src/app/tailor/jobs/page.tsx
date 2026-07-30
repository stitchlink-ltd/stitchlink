"use client";
import { useEffect, useState } from "react";
import { Scissors, Bell, MessageSquareText } from "lucide-react";
import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { BOARD_STAGES, useBoardJobs, type BoardJob, type BoardStage } from "@/lib/mock-board";
import { useMessages } from "@/lib/mock-messages";
import { cn } from "@/lib/utils";

const stageTone: Record<BoardStage, "gray" | "gold" | "green" | "wine"> = {
  Cutting: "gray",
  Sewing: "gold",
  Finishing: "wine",
  Ready: "green",
};

let toastId = 0;

export default function TailorJobsPage() {
  const { jobs, moveJob } = useBoardJobs();
  const { addMessage } = useMessages();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<BoardStage | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const [openComposerId, setOpenComposerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!dragId) return;
    const edge = 96;
    const speed = 22;
    function handleWindowDragOver(event: DragEvent) {
      if (event.clientY < edge) {
        window.scrollBy(0, -speed);
      } else if (event.clientY > window.innerHeight - edge) {
        window.scrollBy(0, speed);
      }
    }
    window.addEventListener("dragover", handleWindowDragOver);
    return () => window.removeEventListener("dragover", handleWindowDragOver);
  }, [dragId]);

  function notify(message: string) {
    const id = toastId++;
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4000);
  }

  function postToClient(job: BoardJob, text: string) {
    addMessage({
      threadId: "kola-and-sons",
      from: "tailor",
      author: "Kola Adeyemi",
      text: `[${job.code} · ${job.title}] ${text}`,
    });
  }

  function handleDrop(stage: BoardStage) {
    if (!dragId) return;
    const job = moveJob(dragId, stage);
    if (job) {
      notify(`${job.owner} notified: "${job.title}" moved to ${stage}`);
      postToClient(job, `Your order moved to ${stage}.`);
      setOpenComposerId(job.id);
      setDraft("");
    }
    setDragOverStage(null);
    setDragId(null);
  }

  function submitComment(job: BoardJob) {
    if (!draft.trim()) {
      setOpenComposerId(null);
      return;
    }
    postToClient(job, draft.trim());
    notify(`${job.owner} notified: new note on "${job.title}"`);
    setDraft("");
    setOpenComposerId(null);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <DashboardHeading
        eyebrow="Capacity · 8 of 12"
        title="Active job board"
        description="Drag a job to a new stage to update the customer timeline and alert the quote owner."
      />
      <div className="grid gap-4 xl:grid-cols-4">
        {BOARD_STAGES.map((stage) => {
          const items = jobs.filter((job) => job.stage === stage);
          return (
            <Panel
              key={stage}
              className={cn(
                "p-4 transition-colors",
                dragOverStage === stage && "bg-[#f4e8d5]/40 ring-2 ring-wine/40"
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage((current) => (current === stage ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(stage);
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">{stage}</h2>
                <span className="text-xs text-muted">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map((job) => (
                  <article
                    key={job.id}
                    draggable
                    onDragStart={(event) => {
                      setDragId(job.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverStage(null);
                    }}
                    className={cn(
                      "cursor-grab rounded-xl border border-line bg-background p-4 active:cursor-grabbing",
                      dragId === job.id && "opacity-40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Scissors size={16} className="text-wine shrink-0" />
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <StatusPill tone={stageTone[job.stage]}>{job.stage}</StatusPill>
                        <StatusPill tone={job.status === "due soon" ? "gold" : "green"}>
                          {job.status}
                        </StatusPill>
                      </div>
                    </div>
                    <p className="mt-4 text-sm font-semibold">{job.title}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {job.code} · {job.owner} · due {job.dueDate}
                    </p>
                    <button
                      onClick={() =>
                        setOpenComposerId((current) => (current === job.id ? null : job.id))
                      }
                      className="mt-4 flex items-center gap-1 text-xs font-semibold text-wine"
                    >
                      <MessageSquareText size={13} /> Add progress update →
                    </button>
                    {openComposerId === job.id && (
                      <div className="mt-3 space-y-2 rounded-lg border border-line bg-paper p-3">
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          placeholder={`Note for ${job.owner}…`}
                          rows={2}
                          className="w-full resize-none rounded-md border border-line bg-background p-2 text-xs outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setOpenComposerId(null);
                              setDraft("");
                            }}
                            className="text-xs text-muted"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => submitComment(job)}
                            className="rounded-full bg-wine px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Send to client
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
                {items.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-muted">
                    Drop a job here
                  </p>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-2 rounded-xl border border-line bg-paper p-3 text-xs shadow-lg"
          >
            <Bell size={14} className="mt-0.5 shrink-0 text-wine" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
