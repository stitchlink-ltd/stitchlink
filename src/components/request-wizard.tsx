"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Send } from "lucide-react";
import type { PublishedTailor } from "@/data/marketplace";
import { marketplaceInitialState, submitRequest } from "@/app/marketplace/actions";
import { Button } from "./ui/button";

async function upload(file: File) {
  const response = await fetch("/api/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "request", mimeType: file.type, sizeBytes: file.size }) });
  const signed = await response.json();
  if (!response.ok) throw new Error(signed.error ?? "Unable to upload an image.");
  const stored = await fetch(signed.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!stored.ok) throw new Error("Unable to store an image.");
  return { path: signed.path, mimeType: file.type, sizeBytes: file.size };
}

export function RequestWizard({ initialTailor, tailors }: { initialTailor?: string; tailors: PublishedTailor[] }) {
  const router = useRouter(); const [pending,startTransition] = useTransition(); const [message,setMessage] = useState(""); const [files,setFiles] = useState<File[]>([]);
  const selected = tailors.find((tailor) => tailor.slug === initialTailor);
  async function submit(formData: FormData) {
    setMessage("");
    try {
      const images = await Promise.all(files.map(upload)); formData.set("images",JSON.stringify(images));
      const state = await submitRequest(marketplaceInitialState,formData);
      if (state.status === "success") router.push("/customer?created=1"); else setMessage(state.message ?? "Check the form and try again.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit your request."); }
  }
  return <form action={(formData)=>startTransition(()=>void submit(formData))} className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-line bg-paper soft-shadow">
    <div className="border-b border-line px-6 py-7 sm:px-10"><p className="eyebrow text-wine">Custom request</p><h1 className="mt-2 font-display text-4xl">Tell your tailor what you need.</h1><p className="mt-2 text-sm leading-6 text-muted">Nothing is charged until you accept a structured quote.</p></div>
    <div className="grid gap-5 p-6 sm:p-10">
      <label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">Tailor</span><select name="tailorId" defaultValue={selected?.id ?? ""} required className="min-h-12 w-full rounded-xl border border-line bg-background px-4 text-sm"><option value="">Choose a verified tailor</option>{tailors.map((tailor)=><option key={tailor.id} value={tailor.id}>{tailor.studioName} · {tailor.city}</option>)}</select></label>
      {tailors.length===0&&<p className="rounded-xl bg-wine/5 p-3 text-sm text-wine">There are no verified tailors available yet.</p>}
      <div className="grid gap-5 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">Garment type</span><input name="garmentType" required placeholder="Agbada, dress, suit…" className="min-h-12 w-full rounded-xl border border-line bg-background px-4 text-sm"/></label><label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">Needed by</span><input name="neededBy" type="date" required className="min-h-12 w-full rounded-xl border border-line bg-background px-4 text-sm"/></label></div>
      <label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">Describe the piece</span><textarea name="description" required minLength={10} rows={5} placeholder="Silhouette, occasion, fabric, colours and details…" className="w-full rounded-xl border border-line bg-background p-4 text-sm"/></label>
      <div className="grid gap-5 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">Budget in NGN</span><input name="budgetNgn" type="number" min="50000" step="1000" required className="min-h-12 w-full rounded-xl border border-line bg-background px-4 text-sm"/></label><label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">Measurements</span><select name="measurementMethod" defaultValue="profile" className="min-h-12 w-full rounded-xl border border-line bg-background px-4 text-sm"><option value="profile">Use saved profile</option><option value="call">Book a call</option><option value="later">Decide with tailor</option></select></label></div>
      <label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">Delivery</span><select name="deliveryPreference" defaultValue="shipping" className="min-h-12 w-full rounded-xl border border-line bg-background px-4 text-sm"><option value="shipping">Ship to my address</option><option value="pickup">Pick up from atelier</option><option value="decide_later">Decide with tailor</option></select></label>
      <label className="grid cursor-pointer place-items-center rounded-xl border border-dashed border-line bg-background p-6 text-center"><ImagePlus className="text-wine"/><span className="mt-2 text-sm font-semibold">Add up to five inspiration images</span><span className="mt-1 text-xs text-muted">JPG, PNG or WEBP · max 10 MB each</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event)=>setFiles(Array.from(event.target.files ?? []).slice(0,5))}/></label>
      {files.length>0&&<p className="text-xs text-muted">{files.length} image{files.length===1?"":"s"} selected</p>}
      <label className="flex gap-3 text-xs text-muted"><input name="hasFabric" type="checkbox" className="mt-0.5 accent-wine"/>I already have the fabric.</label>
      {message&&<p className="rounded-xl bg-wine/5 p-3 text-sm text-wine">{message}</p>}
    </div>
    <div className="flex justify-end border-t border-line bg-background px-6 py-5 sm:px-10"><Button disabled={pending||tailors.length===0}>{pending?<><LoaderCircle size={16} className="animate-spin"/>Submitting</>:<><Send size={16}/>Submit request</>}</Button></div>
  </form>;
}
