# Production authentication runbook

StitchLink uses Supabase email/password and Google OAuth with PKCE. Public users can register only as `customer` or `tailor`; administrators are invited privately and must complete TOTP before any admin policy grants access.

## Supabase dashboard

1. Add the production site URL and these redirect URLs: `/auth/callback` for production, staging, and localhost.
2. Enable email confirmation, Google OAuth, PKCE, leaked-password protection, and Cloudflare Turnstile. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to the public site key and configure the secret only in Supabase.
3. Configure Resend SMTP with a verified StitchLink sending domain. Install the branded files in `supabase/templates` as the confirmation, recovery, and security-notice templates.
4. Apply migrations `0001`, `0002`, and `0003` in order. The last migration protects role fields, synchronizes confirmed email, and requires an `aal2` JWT for admin RLS policies.
5. Keep refresh-token reuse detection enabled. Set appropriate signup and recovery rate limits in Supabase Auth.

## Application environment

Set the Supabase URL and anon key in every environment. Production authentication fails closed if either is absent. `DEMO_MODE=true` is accepted only outside production and startup validation rejects it when `NODE_ENV=production`.

## Invite an administrator

With the production service role key available only in the operator shell, run:

```bash
npm run admin:invite -- --email admin@example.com --name "Admin Name"
```

The command sends an invite, promotes the new profile through the service role, marks MFA required, and records an audit event. Never use public signup for administrators. The administrator enrolls a TOTP authenticator on first access to `/admin`.

## Acceptance requiring live providers

Run the browser flows against a staging Supabase project: customer and tailor confirmation, expired confirmation links, duplicate-email signup, Google signup for both roles, recovery, sign-out, refresh, and admin TOTP. Confirm direct cross-role requests redirect to the database role’s home, and inspect the JWT to verify admin requests use `aal2`.
