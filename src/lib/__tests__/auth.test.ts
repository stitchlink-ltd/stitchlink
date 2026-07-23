import { describe, expect, it } from "vitest";
import { genericAuthError, isDemoModeEnabled, roleHome, sanitizeNextPath, signUpSchema, updatePasswordSchema } from "@/lib/auth/rules";

describe("authentication rules", () => {
  it("requires a ten-character matching password and terms consent", () => {
    const base = { fullName:"Ada Okafor", email:"ADA@example.com", role:"customer", password:"short", confirmPassword:"different", terms:"on" };
    expect(signUpSchema.safeParse(base).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password:"long-password", confirmPassword:"long-password" }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...base, password:"long-password", confirmPassword:"long-password", terms:undefined }).success).toBe(false);
  });

  it("never permits public admin registration", () => {
    const result = signUpSchema.safeParse({ fullName:"Private Admin", email:"admin@example.com", role:"admin", password:"long-password", confirmPassword:"long-password", terms:"on" });
    expect(result.success).toBe(false);
  });

  it("accepts only role-owned relative next destinations", () => {
    expect(sanitizeNextPath("/customer/orders?status=active", "customer")).toBe("/customer/orders?status=active");
    expect(sanitizeNextPath("/tailor", "customer")).toBeNull();
    expect(sanitizeNextPath("//evil.example/customer", "customer")).toBeNull();
    expect(sanitizeNextPath("https://evil.example/customer", "customer")).toBeNull();
    expect(sanitizeNextPath("/customer-support", "customer")).toBeNull();
  });

  it("routes new and onboarded tailors separately", () => {
    expect(roleHome("tailor", false)).toBe("/tailor/onboarding");
    expect(roleHome("tailor", true)).toBe("/tailor");
    expect(roleHome("admin")).toBe("/admin");
  });

  it("enables demo mode only outside production and only explicitly", () => {
    expect(isDemoModeEnabled("development", "true")).toBe(true);
    expect(isDemoModeEnabled("development", undefined)).toBe(false);
    expect(isDemoModeEnabled("production", "true")).toBe(false);
  });

  it("uses generic provider errors and validates password recovery", () => {
    expect(genericAuthError().message).not.toMatch(/email|account exists|user not found/i);
    expect(updatePasswordSchema.safeParse({password:"a-secure-password",confirmPassword:"a-secure-password"}).success).toBe(true);
    expect(updatePasswordSchema.safeParse({password:"a-secure-password",confirmPassword:"not-the-same"}).success).toBe(false);
  });
});
