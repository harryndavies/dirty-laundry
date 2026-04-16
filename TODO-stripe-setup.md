# Stripe Pro Purchase Setup

## 1. Stripe Dashboard

- [ ] Create a Stripe account at https://dashboard.stripe.com (or log in)
- [ ] Go to **Products** → **Add product**
  - Name: `Dirty Laundry Pro`
  - Pricing: **One-time**, £4.99
  - Copy the **Price ID** (starts with `price_...`)
- [ ] Go to **Developers** → **API keys**
  - Copy the **Secret key** (starts with `sk_test_...` for test mode)
- [ ] Go to **Developers** → **Webhooks** → **Add endpoint**
  - URL: `https://ldluxsoyevjrzualmfvo.supabase.co/functions/v1/stripe-webhook`
  - Events to listen for: `checkout.session.completed`
  - Copy the **Signing secret** (starts with `whsec_...`)

## 2. Supabase Edge Function Secrets

Go to **Supabase Dashboard** → **Edge Functions** → **Secrets** and add:

| Secret Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` from step 1 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step 1 |
| `STRIPE_PRICE_ID` | `price_...` from step 1 |
| `APP_URL` | `https://dirtylaundry.club` (or your production URL) |

## 3. Deploy Edge Functions

```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

The `--no-verify-jwt` flag on the webhook is required because Stripe calls it directly (no auth header).

## 4. Test

- Use Stripe **test mode** (toggle in dashboard top-right)
- Test card number: `4242 4242 4242 4242`, any future expiry, any CVC
- Go to Group Settings → Pocket Money → tap "UNLOCK NOW"
- Should redirect to Stripe, complete payment, redirect back with success toast
- Check Supabase: group's `is_pro` should be `true`

## 5. Go Live

- [ ] Switch Stripe to **live mode**
- [ ] Update secrets with live keys (`sk_live_...`, new `whsec_...`, same `price_...` or create a live price)
- [ ] Redeploy edge functions
