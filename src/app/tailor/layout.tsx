import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/data/auth";
export default async function TailorLayout({ children }: { children: React.ReactNode }) {
  const account = await requireRole("tailor");
  return (
    <AppShell
      role="tailor"
      identity={{
        name: account.displayName,
        subtitle: account.tailorOnboarded ? "Tailor workspace" : "Onboarding",
      }}
      demo={"demo" in account}
    >
      {children}
    </AppShell>
  );
}
