# Security Audit Review - StitchLink Marketplace

**Date:** 2026-07-26  
**Application:** StitchLink (Next.js + Supabase Marketplace)  
**Status:** Production-ready with concerns identified

---

## Executive Summary

StitchLink demonstrates solid security fundamentals with proper authentication, RLS policies, input validation, and payment protection. However, several critical gaps require remediation before production deployment. Most concerns are medium severity and addressable through targeted fixes.

### Risk Level: **MEDIUM** 🟡

---

## ✅ Strengths

### 1. **Authentication & Authorization**
- ✅ Proper Supabase Auth with email confirmation + Google OAuth (PKCE)
- ✅ Admin MFA requirement (TOTP) enforced in code (`aal2` JWT check)
- ✅ Role-based access control (customer, tailor, admin)
- ✅ Protected profile security fields with trigger functions
- ✅ OAuth role cookie with secure, SameSite flags

### 2. **Database Security**
- ✅ Row-Level Security (RLS) enabled on all 29 tables
- ✅ Comprehensive RLS policies for data isolation
- ✅ Atomic transactions for quote acceptance + capacity reservation
- ✅ Immutable ledger entries (`revoke all` on webhook_events, ledger_entries)
- ✅ Sensitive functions only callable by service role

### 3. **Input Validation**
- ✅ Zod schema validation on all API endpoints
- ✅ Email lowercasing to prevent case-sensitivity bypasses
- ✅ Password minimum 10 chars, max 128 chars
- ✅ File type & size restrictions (JPG/PNG/WEBP, max 10MB)
- ✅ File upload paths sanitized with UUIDs

### 4. **API Security**
- ✅ HMAC-SHA512 webhook signature verification (Paystack)
- ✅ `timingSafeEqual` used for signature comparison (timing attack resistant)
- ✅ Webhook idempotency via unique event keys
- ✅ Cron endpoint Bearer token authorization
- ✅ Form action restricted to `'self'` in CSP

### 5. **Security Headers**
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: DENY` (clickjacking protection)
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Permissions-Policy` restricts camera/microphone/geolocation
- ✅ `powered-by` header disabled

### 6. **Code Quality**
- ✅ TypeScript strict mode
- ✅ Server-only imports for sensitive operations
- ✅ Environment variable validation at startup
- ✅ Production build refuses `DEMO_MODE=true`
- ✅ Path sanitization for redirect parameters

---

## ⚠️ Critical Issues (Fix Before Production)

### 1. **Content Security Policy Too Permissive** 🔴
**Location:** [next.config.ts](next.config.ts#L15-L20)

```typescript
script-src 'self' 'unsafe-inline' 'unsafe-eval' ...
```

**Problem:** `'unsafe-inline'` and `'unsafe-eval'` completely bypass CSP for scripts. This defeats the primary benefit of CSP against XSS.

**Risk:** Reflected/stored XSS vulnerabilities can execute arbitrary JavaScript.

**Recommendation:**
```typescript
script-src 'self' https://js.paystack.co https://challenges.cloudflare.com
```

Use nonces for inline scripts instead:
```typescript
// In middleware or layout
<script nonce={cspNonce}>...</script>
```

**Severity:** 🔴 CRITICAL

---

### 2. **No HSTS Header** 🔴
**Location:** [next.config.ts](next.config.ts#L6-L31)

**Problem:** Missing `Strict-Transport-Security` header. Browser may connect via HTTP on first visit.

**Recommendation:**
```typescript
{
  key: "Strict-Transport-Security",
  value: "max-age=31536000; includeSubDomains; preload"
}
```

**Severity:** 🔴 CRITICAL (MITM risk)

---

### 3. **Missing CSRF Protection on Forms** 🔴
**Location:** All action forms in [src/app/auth/actions.ts](src/app/auth/actions.ts)

**Problem:** No CSRF token validation. POST requests rely only on cookie SameSite, which doesn't protect cross-site forms.

**Example vulnerable flow:**
```
1. User logged into StitchLink
2. User visits malicious.com
3. malicious.com submits: POST /api/payments/initialize with orderId
4. Request includes credentials → payment initialized without consent
```

**Recommendation:**
- Generate CSRF token in layout
- Require token in POST bodies
- Validate before processing

```typescript
// In layout or middleware
const csrf = await generateCSRFToken();

// In forms
<input type="hidden" name="csrf" value={csrf} />

// In actions
if (!verifyCsrfToken(formData.get('csrf'))) return error();
```

**Severity:** 🔴 CRITICAL

---

### 4. **Payment API Missing Amount Verification** 🔴
**Location:** [src/app/api/payments/initialize/route.ts](src/app/api/payments/initialize/route.ts#L12-L15)

**Problem:** No verification that requested amount matches order total.

```typescript
// VULNERABLE: User can request any installment amount
const amountKobo = parsed.data.installment === "deposit" ? 
  split.depositKobo : split.balanceKobo;
```

**Attack:** Customer could call this endpoint with `installment="deposit"` and the code calculates amount server-side (good), but there's no check that the `orderId` actually has pending payments.

Wait, actually reading more carefully: the code does check `deposit_paid_at` and `balance_paid_at`. However, there's a potential issue:

The `splitInstallments` function is called to calculate the split, and amounts are verified against the order. This is actually correct. **UPDATE: This is NOT an issue.**

**Severity:** ✅ Actually OK

---

### 5. **Try-On API Insufficient Validation** 🟠
**Location:** [src/app/api/try-on/route.ts](src/app/api/try-on/route.ts#L3)

```typescript
personImagePath: z.string().min(3).max(500),
garmentImagePath: z.string().min(3).max(500),
```

**Problem:** 
- Only length validation, no path sanitization
- Could contain `../` or other traversal patterns
- No MIME type verification for stored images
- `consent: z.literal(true)` doesn't prevent re-used consent

**Recommendation:**
```typescript
const imagePath = z.string()
  .regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|png|webp)$/)
```

**Severity:** 🟠 MEDIUM

---

## ⚠️ High Severity Issues

### 6. **No Rate Limiting** 🟠
**Affected:** All API endpoints
- `/auth/*` sign-up, password reset
- `/api/payments/initialize` 
- `/api/uploads/sign`
- `/api/webhooks/paystack`

**Problem:** Attackers can brute-force sign-ups, spam uploads, trigger payment attempts.

**Recommendation:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'),
});

export async function POST(request: Request) {
  const { success } = await ratelimit.limit(request.headers.get('x-forwarded-for'));
  if (!success) return Response.json({ error: 'Too many requests' }, { status: 429 });
  // ...
}
```

**Severity:** 🟠 HIGH

---

### 7. **Admin API Endpoints Not Rate Limited** 🟠
**Location:** [src/app/api/cron/marketplace/route.ts](src/app/api/cron/marketplace/route.ts)

```typescript
export async function POST(request: Request) {
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`)
    return new Response("Unauthorized", { status: 401 });
  // ... RPC calls to calculate grades and mark payouts
}
```

**Problem:**
- Bearer token only in header ✅ (good)
- But no rate limiting - if token is compromised, attacker can spam RPC calls
- Recalculate grades/payouts functions are expensive

**Recommendation:**
- Keep Vercel cron internal-only (IP allowlist)
- Add timeout to RPC operations
- Log all executions

**Severity:** 🟠 HIGH

---

### 8. **Tailor Verification Documents Accessible to Admin Only, but No Expiry Enforcement** 🟠
**Location:** [supabase/migrations/0001_initial.sql](supabase/migrations/0001_initial.sql#L84-L90)

```sql
expires_at timestamptz,
-- but no trigger to soft-delete expired documents
```

**Problem:** Expired verification documents remain accessible. No policy prevents listing/viewing expired docs.

**Recommendation:**
```sql
create policy verification_docs_not_expired on public.verification_documents 
  for select using(expires_at > now() or public.is_admin());

-- Cron job to delete
update public.verification_documents 
set storage_path = null 
where expires_at < now() and storage_path is not null;
```

**Severity:** 🟠 HIGH

---

## ⚠️ Medium Severity Issues

### 9. **Quote Expiry Not Enforced at API Level** 🟡
**Location:** [src/app/api/payments/initialize/route.ts](src/app/api/payments/initialize/route.ts)

**Problem:** While RLS check `expires_at > now()` exists in `accept_quote_and_reserve()`, there's no check in the payment initialization that the quote is still valid.

**Recommendation:**
```typescript
const { data: quote, error } = await supabase
  .from("quotes")
  .select("expires_at")
  .eq("id", parsed.data.quoteId)
  .gt("expires_at", "now()")
  .single();
if (error || !quote) return Response.json({ error: "Quote expired" }, { status: 410 });
```

**Severity:** 🟡 MEDIUM

---

### 10. **Webhook Duplicate Processing** 🟡
**Location:** [src/app/api/webhooks/paystack/route.ts](src/app/api/webhooks/paystack/route.ts#L11-L12)

```typescript
const { error: eventError } = await admin
  .from("webhook_events")
  .insert({ provider: "paystack", event_key: eventKey, ... });
if (eventError?.code === "23505") return new Response("Already processed", { status: 200 });
```

**Problem:** Relies on unique constraint in database. If insert fails with network error (not 23505), duplicate payment could be recorded.

**Better approach:**
```typescript
// Check if already processed BEFORE webhook logic
const { data: existing } = await admin
  .from("webhook_events")
  .select("id")
  .eq("event_key", eventKey)
  .maybeSingle();
if (existing) return new Response("Already processed", { status: 200 });
```

**Severity:** 🟡 MEDIUM

---

### 11. **Error Messages Leak Information** 🟡
**Location:** Multiple endpoints

```typescript
if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
if (error) return Response.json({ error: "Ledger update failed" }, { status: 500 });
```

**Problem:** Error messages differ between "Order not found" (404) and "Ledger update failed" (500). Attackers can enumerate valid orders.

**Recommendation:**
```typescript
return Response.json({ 
  error: "Could not process request" 
}, { status: 400 });
// Log actual error server-side with Sentry
console.error("Payment processing failed:", error);
```

**Severity:** 🟡 MEDIUM (Information disclosure)

---

### 12. **Push Subscription Not Validated** 🟡
**Location:** [src/app/api/push-subscriptions/route.ts](src/app/api/push-subscriptions/route.ts)

```typescript
const schema = z.object({
  endpoint: z.url(),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});
```

**Problem:** No size limits on subscription object. Could store very large objects.

**Recommendation:**
```typescript
const schema = z.object({
  endpoint: z.string().url().max(500),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string().max(200),
    auth: z.string().max(200)
  })
});
```

**Severity:** 🟡 MEDIUM (DoS)

---

## 🟡 Low Severity Issues

### 13. **Demo Mode Detection Could Be Bypassed** 🟢
**Location:** [src/data/auth.ts](src/data/auth.ts#L43-L51)

```typescript
if (isDemoModeEnabled(process.env.NODE_ENV, process.env.DEMO_MODE)) {
  const labels = { customer: "Nneka Okafor", tailor: "Kola Adeyemi", admin: "Dami Bello" };
  return { demo: true, role: expected, displayName: labels[expected], tailorOnboarded: true };
}
```

**Problem:** Demo mode only checks `DEMO_MODE === "true"` string. Should validate more strictly.

**Recommendation:**
```typescript
// In env.ts add validation
export const isDemoModeAllowed = 
  process.env.NODE_ENV !== "production" &&
  env.DEMO_MODE === "true";
```

**Severity:** 🟢 LOW

---

### 14. **NextPath Sanitization Could Allow Fragment Attacks** 🟢
**Location:** [src/lib/auth/rules.ts](src/lib/auth/rules.ts#L68-L83)

```typescript
export function sanitizeNextPath(value: ..., role: AppRole) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) 
    return null;
  // ... checks for origin
  return `${url.pathname}${url.search}${url.hash}`;
}
```

**Problem:** Allows `#` fragments in redirects. Could redirect to legitimate page but with hash containing JavaScript.

```
/customer/orders#<img src=x onerror="alert(1)">
```

**Recommendation:**
```typescript
return `${url.pathname}${url.search}`; // Remove hash
```

**Severity:** 🟢 LOW (Modern browsers XSS protect fragments)

---

### 15. **Admin Grade Override Not Logged** 🟢
**Location:** [supabase/migrations/0001_initial.sql](supabase/migrations/0001_initial.sql) - no triggers for grade_override

**Problem:** Admins can override grades without audit trail.

**Recommendation:**
```sql
create trigger log_grade_override 
before update on public.tailor_profiles
for each row
when (new.grade_override is distinct from old.grade_override)
execute function public.audit_grade_change();
```

**Severity:** 🟢 LOW

---

## 📋 Checklist for Production

- [ ] **CRITICAL:** Remove `'unsafe-inline'` and `'unsafe-eval'` from CSP
- [ ] **CRITICAL:** Add HSTS header with max-age=31536000
- [ ] **CRITICAL:** Implement CSRF token validation on all forms
- [ ] **HIGH:** Add rate limiting (Upstash, Redis, or in-memory)
- [ ] **HIGH:** Verify quote expiry at payment initialization
- [ ] **HIGH:** Enforce verification document expiry
- [ ] **MEDIUM:** Validate try-on image paths with regex
- [ ] **MEDIUM:** Improve webhook duplicate detection
- [ ] **MEDIUM:** Standardize error responses to not leak info
- [ ] **MEDIUM:** Add size limits to push subscriptions
- [ ] **LOW:** Remove URL fragments from redirects
- [ ] **LOW:** Add audit logging for admin actions
- [ ] **Operational:** Enable WAF on Vercel (DDoS protection)
- [ ] **Operational:** Enable backup + point-in-time recovery
- [ ] **Operational:** Set up log retention and monitoring
- [ ] **Operational:** Conduct third-party penetration test
- [ ] **Operational:** Review Paystack verification workflow

---

## 🔐 Additional Recommendations

### 1. **API Key Rotation**
- Rotate `PAYSTACK_SECRET_KEY` every 90 days
- Rotate `SUPABASE_SERVICE_ROLE_KEY` every 6 months
- Automate via secrets manager (1Password, AWS Secrets Manager)

### 2. **Monitoring & Alerting**
```typescript
// Add Sentry for error tracking
if (Math.random() < 0.1) { // 10% sample rate
  console.error("Payment failed", { orderId, error });
}

// Alert on:
// - Failed payment signature verification
// - Multiple failed auth attempts
// - Admin role changes
// - Grade overrides
```

### 3. **Security Testing**
- OWASP ZAP scan for XSS/SQLi
- Burp Suite for CSRF/rate limiting
- Dependency audit: `npm audit --production`

### 4. **Incident Response**
- Document incident response playbook
- Define escalation contacts
- Practice payment reversal procedure

---

## Summary Table

| Issue | Severity | Type | Status |
|-------|----------|------|--------|
| CSP unsafe-inline | 🔴 CRITICAL | XSS | ❌ Not Fixed |
| Missing HSTS | 🔴 CRITICAL | MITM | ❌ Not Fixed |
| No CSRF tokens | 🔴 CRITICAL | CSRF | ❌ Not Fixed |
| No rate limiting | 🟠 HIGH | DoS/Brute Force | ❌ Not Fixed |
| Document expiry not enforced | 🟠 HIGH | Logic | ❌ Not Fixed |
| Try-on path validation | 🟠 HIGH | Path Traversal | ⚠️ Partial |
| Webhook duplicate check | 🟡 MEDIUM | Race Condition | ⚠️ Acceptable |
| Error info disclosure | 🟡 MEDIUM | Info Disclosure | ⚠️ Acceptable |
| Push subscription limits | 🟡 MEDIUM | DoS | ❌ Not Fixed |
| Fragment in redirects | 🟢 LOW | XSS | ⚠️ Modern browsers safe |
| Grade override audit | 🟢 LOW | Audit | ❌ Not Fixed |

---

**Review Completed:** 2026-07-26  
**Recommendation:** Address all CRITICAL and HIGH severity issues before production launch.
