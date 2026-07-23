import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/data/auth";
export default async function AdminLayout({children}:{children:React.ReactNode}){const account=await requireRole("admin");return <AppShell role="admin" identity={{name:account.displayName,subtitle:"Marketplace admin"}} demo={"demo" in account}>{children}</AppShell>}
