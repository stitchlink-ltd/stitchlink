import { SectionPlaceholder } from "@/components/section-placeholder";
export default function AdminOrdersPage() {
  return (
    <SectionPlaceholder
      eyebrow="Marketplace ledger"
      title="Orders"
      description="Search orders by reference, party, stage, payment state or deadline."
    >
      <div className="grid gap-3">
        {[
          "STL-2408 · Sewing · On track",
          "STL-2413 · Cutting · On track",
          "STL-2314 · Disputed · Funds frozen",
        ].map((item) => (
          <div key={item} className="rounded-lg  bg-background p-4 text-sm font-semibold">
            {item}
          </div>
        ))}
      </div>
    </SectionPlaceholder>
  );
}
