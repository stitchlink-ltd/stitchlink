import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { AdminAccountActions } from "@/components/admin-account-actions";
import { requireRole } from "@/data/auth";
import { getAllAccounts } from "@/data/admin";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminUsersPage() {
  const account = await requireRole("admin");
  const accounts = "demo" in account ? [] : await getAllAccounts();

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading
        eyebrow="Accounts and access"
        title="Users"
        description="Customer, tailor and administrator identities with role and account status."
      />
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="p-4">Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((user) => (
                <tr key={user.id} className="border-t border-line align-top">
                  <td className="p-4">
                    <p className="font-semibold">{user.displayName}</p>
                    {user.email && <p className="text-xs text-muted">{user.email}</p>}
                  </td>
                  <td className="capitalize">{user.role}</td>
                  <td>
                    <StatusPill tone={user.accountStatus === "active" ? "green" : "wine"}>
                      {user.accountStatus === "active" ? "Active" : "Suspended"}
                    </StatusPill>
                    {user.suspendedReason && <p className="mt-1 max-w-[220px] text-[11px] text-muted">{user.suspendedReason}</p>}
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td className="p-4 text-right">
                    <AdminAccountActions userId={user.id} role={user.role} accountStatus={user.accountStatus} />
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted">
                    No accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
