import { UserCheck } from "lucide-react";
import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { AdminApplicationActions } from "@/components/admin-application-actions";
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
          <div key={application.id} className="flex flex-col gap-4 border-b border-line p-5 last:border-0 sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-background text-wine">
              <UserCheck size={18} />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{application.studio}</p>
                <StatusPill tone={index === 0 ? "wine" : "gold"}>{ageLabel(application.submittedAt)}</StatusPill>
              </div>
              <p className="mt-1 text-xs text-muted">
                {application.location} · {application.documentCount} documents ready for review
              </p>
            </div>
            <AdminApplicationActions applicationId={application.id} />
          </div>
        ))}
        {applications.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">No pending applications.</p>
        )}
      </Panel>
    </div>
  );
}
