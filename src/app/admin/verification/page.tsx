import { Mail, UserCheck } from "lucide-react";
import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { AdminApplicationActions } from "@/components/admin-application-actions";
import { AdminAccountActions } from "@/components/admin-account-actions";
import { AdminDocumentViewer } from "@/components/admin-document-viewer";
import { Price } from "@/components/price";
import { requireRole } from "@/data/auth";
import { getPendingTailorApplications } from "@/data/admin";

function ageLabel(submittedAt: string | null) {
  if (!submittedAt) return "New";
  const hours = Math.max(0, Math.round((Date.now() - new Date(submittedAt).getTime()) / 3_600_000));
  if (hours < 1) return "New";
  if (hours < 48) return `${hours} hr`;
  return `${Math.round(hours / 24)} d`;
}

export default async function AdminVerificationPage() {
  const account = await requireRole("admin");
  const applications = "demo" in account ? [] : await getPendingTailorApplications();

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading
        eyebrow="Manual review"
        title="Tailor verification"
        description="Approving publishes the atelier to the public tailors directory. Rejecting notifies the tailor with your reason."
      />
      <Panel className="overflow-hidden">
        {applications.map((application, index) => (
          <div key={application.id} className="flex flex-col gap-4 border-b border-line p-5 last:border-0 sm:flex-row sm:items-start">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-background text-wine">
              <UserCheck size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{application.studio}</p>
                <StatusPill tone={index === 0 ? "wine" : "gold"}>{ageLabel(application.submittedAt)}</StatusPill>
                {application.accountStatus === "suspended" && <StatusPill tone="wine">Suspended</StatusPill>}
              </div>
              <p className="mt-1 text-xs text-muted">
                {application.displayName}
                {application.email && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <Mail size={11} /> {application.email}
                  </span>
                )}
              </p>
              <p className="mt-2 text-xs text-muted">
                {[application.city, application.state].filter(Boolean).join(", ")}
                {" · "}
                <Price kobo={application.startingPriceKobo} showExact={false} className="inline" /> from
                {" · "}
                {application.turnaroundMinDays}–{application.turnaroundMaxDays} day turnaround
              </p>
              {application.bio && <p className="mt-3 max-w-2xl text-sm leading-6">{application.bio}</p>}
              {application.specialties.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {application.specialties.map((specialty) => (
                    <span key={specialty} className="rounded-full border border-line bg-background px-2.5 py-1 text-[11px] font-semibold text-muted">
                      {specialty}
                    </span>
                  ))}
                </div>
              )}
              <AdminDocumentViewer documents={application.documents} />
            </div>
            <div className="flex flex-col items-end gap-3">
              <AdminApplicationActions applicationId={application.id} />
              <AdminAccountActions userId={application.tailorId} role="tailor" accountStatus={application.accountStatus} />
            </div>
          </div>
        ))}
        {applications.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">No pending applications.</p>
        )}
      </Panel>
    </div>
  );
}
