"use client";
import { useRef, useState } from "react";
import { Star, Trash2, UploadCloud } from "lucide-react";
import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { tailors } from "@/lib/demo-data";

const MAX_UNVERIFIED_PIECES = 3;

type PortfolioPiece = {
  id: string;
  src: string;
  isDisplay: boolean;
};

const seedPieces: PortfolioPiece[] = ["38%", "51%", "72%", "88%"].map((position, index) => ({
  id: `seed-${index}`,
  src: "/stitchlink-hero.png",
  isDisplay: index === 0,
}));

export default function PortfolioPage() {
  const tailor = tailors.find((item) => item.slug === "kola-and-sons")!;
  const [pieces, setPieces] = useState<PortfolioPiece[]>(seedPieces);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const atLimit = !tailor.verified && pieces.length >= MAX_UNVERIFIED_PIECES;

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = tailor.verified ? Infinity : MAX_UNVERIFIED_PIECES - pieces.length;
    const accepted = Array.from(files).slice(0, Math.max(remaining, 0));
    accepted.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = typeof reader.result === "string" ? reader.result : "";
        if (!src) return;
        setPieces((current) => [
          ...current,
          { id: `piece-${Date.now()}-${Math.round(Math.random() * 1000)}`, src, isDisplay: current.length === 0 },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function deletePiece(id: string) {
    setPieces((current) => {
      const next = current.filter((piece) => piece.id !== id);
      const removedWasDisplay = current.find((piece) => piece.id === id)?.isDisplay;
      if (removedWasDisplay && next.length > 0) next[0] = { ...next[0], isDisplay: true };
      return next;
    });
  }

  function setDisplay(id: string) {
    setPieces((current) => current.map((piece) => ({ ...piece, isDisplay: piece.id === id })));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading
        eyebrow="Public profile"
        title="Portfolio"
        description="Curate the work customers see before starting a request. The starred piece is your display photo on your tailors page."
        action={
          <div className="flex items-center gap-3">
            {tailor.verified ? (
              <StatusPill tone="green">Verified · unlimited uploads</StatusPill>
            ) : (
              <StatusPill tone="gold">
                {pieces.length} / {MAX_UNVERIFIED_PIECES} pieces
              </StatusPill>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={atLimit}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-wine px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UploadCloud size={16} /> Add portfolio piece
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </div>
        }
      />
      <Panel className="p-6 sm:p-8">
        {!tailor.verified && (
          <p className="mb-5 rounded-lg border border-line bg-background p-3 text-xs leading-5 text-muted">
            Unverified ateliers can upload up to {MAX_UNVERIFIED_PIECES} pieces. Complete{" "}
            <span className="font-semibold text-wine">verification</span> to upload as many as you like.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {pieces.map((piece, index) => (
            <div key={piece.id} className="group relative aspect-square overflow-hidden rounded-xl">
              <img
                src={piece.src}
                alt={`Portfolio piece ${index + 1}`}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col justify-between bg-linear-to-t from-black/60 via-transparent to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => deletePiece(piece.id)}
                    aria-label="Delete piece"
                    className="grid size-8 place-items-center rounded-full bg-white/90 text-wine"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <button
                  onClick={() => setDisplay(piece.id)}
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-ink"
                >
                  <Star size={12} className={piece.isDisplay ? "fill-gold text-gold" : ""} />
                  {piece.isDisplay ? "Display photo" : "Set as display"}
                </button>
              </div>
              {piece.isDisplay && (
                <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-gold">
                  <Star size={14} className="fill-gold" />
                </span>
              )}
            </div>
          ))}
          {pieces.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
              No portfolio pieces yet. Add your first one.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
