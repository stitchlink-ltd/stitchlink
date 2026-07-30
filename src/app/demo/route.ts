import { NextResponse, type NextRequest } from "next/server";
import { demoRoleCookieName, isDemoModeEnabled, type AppRole } from "@/lib/auth/rules";

const demoRoles: AppRole[] = ["customer", "tailor", "admin"];

export function GET(request: NextRequest) {
  if (!isDemoModeEnabled(process.env.NODE_ENV, process.env.DEMO_MODE)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const role = request.nextUrl.searchParams.get("role");
  if (!demoRoles.includes(role as AppRole)) {
    return new NextResponse("Unknown demo role.", { status: 400 });
  }

  const demoRole = role as AppRole;
  const response = NextResponse.redirect(new URL(`/${demoRole}`, request.url));
  response.cookies.set({
    name: demoRoleCookieName,
    value: demoRole,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
