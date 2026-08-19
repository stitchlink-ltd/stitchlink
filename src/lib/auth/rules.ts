import { z } from "zod";

export const publicRoles = ["customer", "tailor"] as const;
export const oauthCookieNames = { role: "stitchlink_oauth_role", next: "stitchlink_oauth_next" } as const;
export const demoRoleCookieName = "stitchlink_demo_role";
export type PublicRole = (typeof publicRoles)[number];
export type AppRole = PublicRole | "admin";
export const demoRoles: AppRole[] = ["customer", "tailor", "admin"];
export const demoDisplayNames: Record<AppRole, string> = { customer: "Nneka Okafor", tailor: "Kola Adeyemi", admin: "Dami Bello" };

const password = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use no more than 128 characters.");

export const signInSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(100, "Name is too long."),
    email: z.email("Enter a valid email address.").trim().toLowerCase(),
    role: z.enum(publicRoles, { error: "Choose how you will use StitchLink." }),
    password,
    confirmPassword: z.string(),
    terms: z.literal("on", { error: "You must accept the terms to continue." }),
    next: z.string().optional(),
    captchaToken: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const emailSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  captchaToken: z.string().optional(),
});

export const updatePasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const updateDisplayNameSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name.").max(100, "Name is too long."),
});

export const updateCalendlyUrlSchema = z.object({
  calendlyUrl: z
    .string()
    .trim()
    .max(300, "Link is too long.")
    .refine((value) => value === "" || value.startsWith("https://calendly.com/"), {
      message: "Enter a valid Calendly link (https://calendly.com/…) or leave it blank.",
    }),
});

export type AuthFieldErrors = Partial<
  Record<"fullName" | "email" | "role" | "password" | "confirmPassword" | "terms" | "captchaToken" | "studioName" | "bio" | "city" | "state" | "specialties" | "displayName" | "calendlyUrl", string[]>
>;

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: AuthFieldErrors;
};

export const initialAuthState: AuthActionState = { status: "idle" };

export function isDemoModeEnabled(nodeEnv: string | undefined, demoMode: string | undefined) {
  return nodeEnv !== "production" && demoMode === "true";
}

export function roleHome(role: AppRole, tailorOnboarded = false) {
  if (role === "tailor") return tailorOnboarded ? "/tailor" : "/tailor/onboarding";
  return `/${role}`;
}

export function sanitizeNextPath(value: FormDataEntryValue | string | null | undefined, role: AppRole) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  let url: URL;
  try {
    url = new URL(value, "https://stitchlink.local");
  } catch {
    return null;
  }
  if (url.origin !== "https://stitchlink.local" || !url.pathname.startsWith(`/${role}`)) return null;
  const boundary = url.pathname.charAt(role.length + 1);
  if (boundary && boundary !== "/") return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function sanitizeRecoveryNext(value: string | null | undefined) {
  return value === "/update-password" ? value : null;
}

export function genericAuthError(): AuthActionState {
  return { status: "error", message: "We could not complete that request. Check your details and try again." };
}
