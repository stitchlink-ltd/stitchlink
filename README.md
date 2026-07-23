# StitchLink

StitchLink is a production-structured marketplace for commissioning verified Nigerian tailors from anywhere in the world. It includes customer, tailor, and administrator workspaces; structured custom quotes; versioned measurements; production tracking; protected NGN payments; grading and capacity controls; reviews; disputes; and an experimental virtual try-on provider boundary.

## What is implemented

- Editorial responsive marketplace, searchable tailor directory, detailed profiles, and four-step request flow
- Customer workspace for orders, messages, measurements, appointments, payments, and concept try-on
- Tailor workspace for capacity, jobs, quotes, appointments, portfolio, earnings, verification, and grade progress
- Admin workspace for verification, disputes, orders, payout operations, users, and configurable grade policies
- Supabase Auth/Postgres/Realtime/Storage architecture with RLS, private files, immutable payment ledger, atomic capacity reservation, and scheduled grade/payout functions
- Paystack initialization and signed/idempotent webhook endpoints that verify transactions server-side
- NGN-authoritative pricing with an Open Exchange Rates adapter for indicative USD display
- Installable PWA shell that deliberately excludes authenticated and API routes from offline caching
- Sentry instrumentation, security headers, server-only secret boundaries, tests, and CI

The application has a fictional demo experience only when `DEMO_MODE=true` in development. Without Supabase, all protected routes otherwise fail closed. Production startup rejects demo mode.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Keep `DEMO_MODE=true` for fictional local workspaces, or configure Supabase to test real authentication.

## Production setup

1. Create separate Supabase projects for staging and production.
2. Apply all migrations in `supabase/migrations` in numerical order.
3. Generate exact database types after linking the project:

   ```bash
   npx supabase gen types typescript --linked > src/lib/supabase/types.ts
   ```

4. Configure the variables documented in `.env.example` in Vercel. Never expose Paystack or Supabase service-role keys with `NEXT_PUBLIC_`.
5. Configure the Paystack webhook URL as `https://YOUR_DOMAIN/api/webhooks/paystack`.
6. Obtain Paystack approval for international card collection, Transfers, and Manual Payouts before enabling live checkout. StitchLink is payment protection, not legal escrow.
7. Confirm the daily Vercel cron reaches `/api/cron/marketplace` with `CRON_SECRET` authorization.
8. Follow `docs/auth-production.md` to configure Google PKCE, Resend SMTP, Turnstile, leaked-password protection, private admin invitations, and TOTP. Then configure storage lifecycle deletion, backups, and point-in-time recovery.
9. Add approved privacy, marketplace, cancellation, payout, and dispute terms after legal review.

## Payment invariants

- All contractual amounts, ledger entries, refunds, and payouts are integer NGN kobo.
- USD is indicative only. Paystack receives an exact NGN charge and the card issuer controls conversion.
- Deposit and balance are 50/50; odd totals assign the extra kobo to the balance.
- Platform commission is 10% of tailoring subtotal and excludes delivery.
- Tailor payable is tailoring plus delivery, minus commission, Paystack fees, refunds, and audited adjustments.
- A deposit consumes a reserved grade-controlled slot. Payout becomes eligible after customer approval or 72 hours after delivery, unless a dispute is open.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The Playwright command requires installed Chromium binaries. Unit tests cover money, grading, capacity, order transitions, and release timing. The migration functions enforce the same rules transactionally in Postgres.

## Important production boundaries

The demo try-on adapter intentionally returns a labelled concept preview. Replace `src/lib/try-on/provider.ts` with an approved provider before representing results as AI-generated garment visualization. Final launch also depends on live provider credentials, counsel-approved policies, operational verification staff, security review, reconciliation rehearsal, and a successful backup-restore test.

The original editorial hero asset was generated specifically for StitchLink and is stored at `public/stitchlink-hero.png`.
