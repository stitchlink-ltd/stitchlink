"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, LoaderCircle, UploadCloud } from "lucide-react";
import { submitTailorApplication } from "@/app/tailor/verification/actions";
import { verificationDocumentTypes as requiredDocuments } from "@/lib/verification-documents";

type UploadedFile = { path: string; mimeType: string; sizeBytes: number };

async function uploadDocument(file: File) {
  const response = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "verification", mimeType: file.type, sizeBytes: file.size }),
  });
  const signed = await response.json();
  if (!response.ok) throw new Error(signed.error ?? "Unable to upload that file.");
  const stored = await fetch(signed.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!stored.ok) throw new Error("Unable to store that file.");
  return { path: signed.path, mimeType: file.type, sizeBytes: file.size };
}

export function TailorVerificationForm({ applicationId, alreadyUploaded }: { applicationId: string; alreadyUploaded: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Record<string, UploadedFile>>({});
  const [message, setMessage] = useState("");

  const isDone = (type: string) => alreadyUploaded.includes(type) || Boolean(uploaded[type]);
  const allDone = requiredDocuments.every((document) => isDone(document.type));

  async function handleFile(type: string, file: File) {
    setMessage("");
    setUploading(type);
    try {
      const result = await uploadDocument(file);
      setUploaded((previous) => ({ ...previous, [type]: result }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload that file.");
    } finally {
      setUploading(null);
    }
  }

  function submit() {
    setMessage("");
    const documents = Object.entries(uploaded).map(([documentType, file]) => ({ documentType, ...file }));
    if (documents.length === 0) {
      setMessage("Upload the documents above before submitting.");
      return;
    }
    startTransition(async () => {
      const result = await submitTailorApplication(applicationId, documents);
      if (result.status === "success") {
        router.refresh();
      } else {
        setMessage(result.message ?? "We could not submit your application.");
      }
    });
  }

  return (
    <div className="mt-6 space-y-3">
      {requiredDocuments.map((document) => {
        const done = isDone(document.type);
        return (
          <label
            key={document.type}
            className={`flex items-center gap-3 rounded-xl p-3 text-sm ${done ? "bg-sage/10" : "cursor-pointer bg-background hover:bg-background/70"}`}
          >
            <FileCheck2 size={16} className={done ? "text-sage" : "text-muted"} />
            <span className="flex-1">{document.label}</span>
            {uploading === document.type ? (
              <LoaderCircle size={14} className="animate-spin text-muted" />
            ) : done ? (
              <span className="text-xs font-semibold text-sage">Uploaded</span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-wine">
                <UploadCloud size={14} /> Upload
              </span>
            )}
            {!done && (
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void handleFile(document.type, file);
                }}
              />
            )}
          </label>
        );
      })}
      {message && <p className="text-xs text-wine">{message}</p>}
      <button
        onClick={submit}
        disabled={!allDone || pending}
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-wine text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending && <LoaderCircle size={16} className="animate-spin" />}
        Submit for review
      </button>
    </div>
  );
}
