import { AuthPanel } from "@/components/auth-panel";
import { isDemoModeEnabled } from "@/lib/auth/rules";
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  return (
    <AuthPanel
      mode="sign-in"
      demoMode={isDemoModeEnabled(process.env.NODE_ENV, process.env.DEMO_MODE)}
      next={typeof params.next === "string" ? params.next : undefined}
      queryError={typeof params.error === "string" ? params.error : undefined}
    />
  );
}
