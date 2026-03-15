# Swrm Payments — Setup Guide

## Overview

```
App (Expo)
    ↓ Tap "Subscribe"
openBillingPortal()
    ↓ Opens in-app browser
Clerk Billing Portal
    ↓ Stripe checkout
    ↓ Payment success
Clerk Webhook
    ↓ POST /clerk-webhook
Convex
    ↓ Update user.plan
App
    ↓ Real-time subscription
Plan Updated ✅
```

---

## Setup Steps

### 1. Enable Clerk Billing (2 min)

```
1. Go to Clerk Dashboard → Billing
2. Connect Stripe Account
3. Create Plans:
   - Basic: $5/agent/mo
   - Pro: $15/agent/mo
   - Team: $49/agent/mo
4. Done
```

**Link:** https://dashboard.clerk.com/last-active?path=billing

---

### 2. Add Webhook (1 min)

```
1. Go to Clerk Dashboard → Webhooks
2. Add Endpoint:
   https://[your-convex].convex.site/clerk-webhook
3. Subscribe to:
   ✓ user.created
   ✓ user.updated
   ✓ billing.subscription.created
   ✓ billing.subscription.updated
   ✓ billing.subscription.active
   ✓ billing.subscription.deleted
4. Copy Signing Secret
```

---

### 3. Set Environment Variables (30 sec)

```bash
# In Convex Dashboard → Environment Variables
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

---

### 4. Test (2 min)

```bash
# 1. Run app
cd /Users/x/.openclaw/workspace/swrm
bun run dev

# 2. Sign in
# 3. Go to Settings → Subscription
# 4. Tap a plan
# 5. Complete checkout (use Stripe test card: 4242 4242 4242 4242)
# 6. Check Convex dashboard → user.plan updated
```

---

## Files

```
app/(app)/paywall.tsx     ← Plan selection UI
convex/http.ts             ← Webhook handler
convex/users.ts            ← User plan management
convex/schema.ts           ← Added users table
```

---

## How It Works

### In-App Browser (Session Synced)

```typescript
// Clerk handles everything
const { openBillingPortal } = useClerk();

// Opens in in-app browser (not Safari)
// Session is synced automatically
await openBillingPortal();
```

**No extra code needed.** Clerk syncs the session between app and browser.

---

### Webhook Flow

```
Stripe Payment Success
    ↓
Clerk fires webhook
    ↓
Convex receives POST /clerk-webhook
    ↓
Verifies signature (Svix)
    ↓
Updates user.plan
    ↓
App subscription updates (real-time)
```

---

## Plans

| Plan | Price | Agents | Features |
|------|-------|--------|----------|
| **Free** | $0 | 0 | None (just for testing) |
| **Basic** | $5/agent/mo | 1 | Unlimited messages, all providers |
| **Pro** | $15/agent/mo | 5 | Priority support, analytics |
| **Team** | $49/agent/mo | Unlimited | Team features, API access |

---

## Testing

### Stripe Test Cards

```
4242 4242 4242 4242  ← Success
4000 0000 0000 0002  ← Decline
4000 0000 0000 9995  ← Insufficient funds
```

Any future expiry date, any CVC.

---

## Debugging

### Check Webhook Logs

```bash
# In Convex Dashboard → Logs
# Look for: "Clerk webhook: billing.subscription.created"
```

### Check User Plan

```bash
# In Convex Dashboard → Data
# users table → plan field
```

---

## Production Checklist

- [ ] Connect Stripe (not test mode)
- [ ] Update price IDs in `http.ts`
- [ ] Set `CLERK_WEBHOOK_SECRET` in production
- [ ] Test with real card
- [ ] Monitor first payments

---

## Security

- ✅ Webhook signature verified (Svix)
- ✅ HTTPS only
- ✅ No secrets in code
- ✅ Environment variables for secrets

---

## Support

- Clerk Billing Docs: https://clerk.com/docs/billing/overview
- Stripe Test Cards: https://stripe.com/docs/testing
- Convex HTTP Actions: https://docs.convex.dev/functions/http-actions

---

*Ready to make money.* 💰
