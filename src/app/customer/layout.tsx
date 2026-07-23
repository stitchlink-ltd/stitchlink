import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/data/auth";
export default async function CustomerLayout({children}:{children:React.ReactNode}){const account=await requireRole("customer");return <AppShell role="customer" identity={{name:account.displayName,subtitle:"Customer"}} demo={"demo" in account}>{children}</AppShell>}
