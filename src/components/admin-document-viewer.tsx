import { verificationDocumentLabel } from "@/lib/verification-documents";
import type { PendingApplicationDocument } from "@/data/admin";

export function AdminDocumentViewer({ documents }: { documents: PendingApplicationDocument[] }) {
  if (documents.length === 0) return <p className="mt-3 text-xs text-muted">No documents uploaded yet.</p>;
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {documents.map((document) => (
        <a
          key={document.id}
          href={`/api/admin/verification-documents/${document.id}`}
          target="_blank"
          rel="noreferrer"
          className="group block w-24 overflow-hidden rounded-xl border border-line bg-background"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- private document behind a signed-URL redirect route, not a static asset */}
          <img
            src={`/api/admin/verification-documents/${document.id}`}
            alt={verificationDocumentLabel(document.documentType)}
            className="h-24 w-24 object-cover transition group-hover:opacity-80"
          />
          <p className="truncate px-1.5 py-1 text-[10px] font-semibold text-muted">{verificationDocumentLabel(document.documentType)}</p>
        </a>
      ))}
    </div>
  );
}
