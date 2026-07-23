import { createClient } from "@supabase/supabase-js";

const emailIndex = process.argv.indexOf("--email");
const nameIndex = process.argv.indexOf("--name");
const email = emailIndex >= 0 ? process.argv[emailIndex + 1] : undefined;
const displayName = nameIndex >= 0 ? process.argv[nameIndex + 1] : "StitchLink Administrator";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !url || !serviceRoleKey) {
  console.error("Usage: npm run admin:invite -- --email admin@example.com --name \"Admin Name\"");
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
  data: { display_name: displayName, full_name: displayName },
  redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/update-password`,
});
if (error || !data.user) {
  console.error(error?.message ?? "Supabase did not create the administrator.");
  process.exit(1);
}

const { error: profileError } = await supabase.from("profiles").update({ role: "admin", mfa_required: true, display_name: displayName }).eq("id", data.user.id);
if (profileError) { console.error(profileError.message); process.exit(1); }
const { error: auditError } = await supabase.from("audit_events").insert({
  actor_id: null,
  action: "admin.invited",
  entity_type: "profile",
  entity_id: data.user.id,
  after_data: { role: "admin", invited_email: email },
});
if (auditError) { console.error(auditError.message); process.exit(1); }
console.log(`Administrator invitation created for ${email}. TOTP enrollment is required at first sign-in.`);
