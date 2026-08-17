import { CheckCircle2, Clock3, FileCheck2, ShieldCheck } from "lucide-react";
import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { ButtonLink } from "@/components/ui/button";
import { TailorVerificationForm } from "@/components/tailor-verification-form";
import { requireRole } from "@/data/auth";
import { getOwnTailorVerification } from "@/data/tailor";
import { capacityForGrade, gradeRules } from "@/lib/grading";
import { verificationDocumentTypes } from "@/lib/verification-documents";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line pb-3">
      <span className="text-muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DemoVerification() {
  return (
    <div className="mx-auto max-w-5xl">
      <DashboardHeading eyebrow="Trust and performance" title="Verification & grade" description="Documents are private, access-logged and retained only for the required period." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-2xl font-semibold">Identity verification</p>
              <p className="text-xs text-muted">Approved June 14, 2026</p>
            </div>
            <StatusPill tone="green">Verified</StatusPill>
          </div>
          <div className="mt-6 space-y-3">
            {verificationDocumentTypes.map((document) => (
              <div key={document.type} className="flex items-center gap-3 rounded-xl bg-background p-3 text-sm">
                <FileCheck2 size={16} className="text-sage" />
                {document.label}
                <CheckCircle2 size={14} className="ml-auto text-sage" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-2xl font-semibold">Grade 4</p>
              <p className="text-xs text-muted">12 active-job capacity</p>
            </div>
            <ShieldCheck className="text-wine" size={32} />
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <Stat label="Completed jobs" value="92 / 100" />
            <Stat label="Average rating" value="4.8 / 4.7" />
            <Stat label="On-time rate" value="94% / 95%" />
            <Stat label="Cancellation rate" value="3.2% / max 5%" />
            <Stat label="Lost disputes" value="1.1% / max 3%" />
          </div>
          <p className="mt-5 text-xs leading-5 text-muted">Grades recalculate nightly. Existing jobs are never cancelled after a demotion.</p>
        </Panel>
      </div>
    </div>
  );
}

export default async function VerificationPage() {
  const account = await requireRole("tailor");
  if ("demo" in account) return <DemoVerification />;

  const verification = await getOwnTailorVerification(account.user.id);

  if (!verification) {
    return (
      <div className="mx-auto max-w-5xl">
        <DashboardHeading eyebrow="Trust and performance" title="Verification & grade" description="Complete your atelier profile to begin verification." />
        <Panel className="p-8 text-center">
          <p className="text-sm text-muted">You haven&apos;t set up your atelier profile yet.</p>
          <ButtonLink href="/tailor/onboarding" className="mt-4 inline-flex">Complete your profile</ButtonLink>
        </Panel>
      </div>
    );
  }

  const status = verification.applicationStatus ?? "draft";
  const canSubmit = status === "draft" || status === "rejected";
  const inReview = status === "submitted" || status === "in_review";
  const approved = status === "approved";
  const nextGrade = gradeRules.find((rule) => rule.grade === verification.grade + 1) ?? gradeRules[0];

  return (
    <div className="mx-auto max-w-5xl">
      <DashboardHeading eyebrow="Trust and performance" title="Verification & grade" description="Documents are private, access-logged and retained only for the required period." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-2xl font-semibold">Identity verification</p>
              <p className="text-xs text-muted">
                {approved && verification.decidedAt
                  ? `Approved ${new Date(verification.decidedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                  : inReview
                    ? "Under review"
                    : status === "rejected"
                      ? "Needs attention"
                      : "Not submitted yet"}
              </p>
            </div>
            <StatusPill tone={approved ? "green" : status === "rejected" ? "wine" : "gold"}>
              {approved ? "Verified" : inReview ? "In review" : status === "rejected" ? "Rejected" : "Draft"}
            </StatusPill>
          </div>

          {status === "rejected" && verification.decisionReason && (
            <p className="mt-4 rounded-xl bg-wine/5 p-3 text-xs leading-5 text-wine">{verification.decisionReason}</p>
          )}

          {canSubmit && verification.applicationId && (
            <TailorVerificationForm applicationId={verification.applicationId} alreadyUploaded={verification.uploadedDocumentTypes} />
          )}

          {inReview && (
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-background p-4 text-sm text-muted">
              <Clock3 size={16} className="text-gold" /> Your documents are with the marketplace team. Most reviews complete within 48 hours.
            </div>
          )}

          {approved && (
            <div className="mt-6 space-y-3">
              {["Government identity", "Studio address", "Bank account match", "Portfolio ownership"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-background p-3 text-sm">
                  <FileCheck2 size={16} className="text-sage" />
                  {item}
                  <CheckCircle2 size={14} className="ml-auto text-sage" />
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-2xl font-semibold">Grade {verification.grade}</p>
              <p className="text-xs text-muted">{capacityForGrade(verification.grade)} active-job capacity</p>
            </div>
            <ShieldCheck className="text-wine" size={32} />
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <Stat label="Completed jobs" value={`${verification.completedJobs} / ${nextGrade.minJobs}`} />
            <Stat label="Average rating" value={`${verification.averageRating.toFixed(1)} / ${nextGrade.minRating}`} />
            <Stat label="On-time rate" value={`${verification.onTimeRate}% / ${nextGrade.minOnTime}%`} />
            <Stat label="Cancellation rate" value={`${verification.cancellationRate}% / max ${nextGrade.maxCancellation}%`} />
            <Stat label="Lost disputes" value={`${verification.lostDisputeRate}% / max ${nextGrade.maxLostDisputes}%`} />
          </div>
          <p className="mt-5 text-xs leading-5 text-muted">Grades recalculate nightly. Existing jobs are never cancelled after a demotion.</p>
        </Panel>
      </div>
    </div>
  );
}
