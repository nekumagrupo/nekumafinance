# Stripe LIVE rollout

Status: implementation in progress; real checkout is NOT enabled.
Migration v18 was applied with user approval on 2026-11-04, with sales disabled.
Supabase saved query: 2b858526-9f35-4d7f-bb11-1a573357560f.
Lifecycle v19 applied with approval: 2f8789f8-c7fe-4db5-b198-ae06307a4050.
Read-only audit: 1cdc12ad-d8cd-4046-b9ac-88c1b799485d.
Audit result: sales false, checkouts/periods/holds zero, all RLS true,
browser payment writes and row reads false.

Authorized LIVE catalog created on 2026-11-04:
- Product: `prod_VZDHwNojYOuikL` (Nekuma PRO).
- Price: `price_1UY4qzGU29o4WrPSkmNjuf7Z` (JPY 480/month).
- Webhook: `we_1UY4tGGU29o4WrPSs3aOKB1y`.
- Endpoint: `https://nekumafinance.app/api/stripe/live-webhook`.
- Nine supported events selected, own account, snapshot payload.
- API version for API reads: `2024-06-20`; webhook snapshot: `2026-09-30.endive`.
  The processor uses only snapshot object IDs and re-fetches objects with pinned API reads.

The isolated `functions/_shared/stripe-live.js` client does not change existing
TEST endpoints. It requires an explicit `STRIPE_LIVE_ENABLED=true` switch,
`STRIPE_LIVE_SECRET_KEY`, `STRIPE_LIVE_ACCOUNT_ID`, and
`STRIPE_LIVE_PRO_PRICE_ID`. Never put secret keys in frontend files.

Before any production checkout, verify the merchant account and the active LIVE
price: JPY 480, quantity one, monthly licensed billing, no Stripe trial.
The app's free three-day trial must not silently become a recurring charge.

## Remaining activation gates

- DONE: Private LIVE ledger independent of TEST clocks and records.
- DONE: Authenticated checkout reservations with duplicate-subscription protection.
- DONE: LIVE webhook signature validation with its separate signing secret.
- DONE: Verify paid invoices and charge ownership before granting each paid period.
- DONE: Preserve paid access when only automatic renewal is cancelled.
- DONE: Hold refunded/disputed charge periods and expire unpaid periods without deleting data.
- DONE: Connect effective commercial access and notifications to the LIVE ledger.
- DONE: Frontend LIVE status/checkout controls (manual status refresh).
- DONE: Renewal cancellation endpoint with explicit user confirmation, ownership
  verification and `cancel_at_period_end=true`; no refund or immediate cancellation.
- DONE: New purchase after confirmed terminal state and no valid remaining period (v19).
- Run replay, out-of-order event, refund, dispute and authorization regression tests.
- Obtain approval before applying production migrations or creating the LIVE webhook.
- Configure secrets directly in Cloudflare; publish with sales still disabled.
- User completes an explicitly approved real purchase; verify the webhook and access.
- Enable public sales only after reviewing the resulting evidence.

## Checks

- `node scripts/verify-stripe-live.cjs` (mocked HTTP).
- `node scripts/verify-stripe-live-checkout.cjs` (authorization and duplicate checkout).
- `node scripts/verify-stripe-live-cancel.cjs` (renewal cancellation).
- `node scripts/verify-stripe-webhook.cjs --live` (mocked LIVE events).
- `node scripts/verify-stripe-webhook.cjs` (TEST regression).
- `node scripts/verify-stripe-live-schema.cjs` (disposable PostgreSQL).
- `node scripts/check.cjs` (static validation).

No real payment has been made or verified by these tests.
All existing TEST endpoints remain isolated. LIVE endpoints use `/api/stripe/live-*`.
Cloudflare must keep `STRIPE_LIVE_PUBLIC=false`; initial authorized UUID only in
`STRIPE_LIVE_USERS`. Do not enable the referral program as part of this rollout.

## Secret key preparation

No existing LIVE secret was present in the account. The user will create
`Nekuma Finance - Servidor LIVE` with custom permissions:
- Read: Accounts, Charges and Refunds, Events, Invoices, Payment Disputes, Prices, Products.
- Write: Checkout Sessions, Customers, Subscriptions.
- No payout, transfer, key-management or webhook-management permission.

The server accepts `sk_live_` and restricted `rk_live_` credentials. Secrets must
remain in Cloudflare; do not commit, print or transmit them through chat.
The LIVE webhook secret is distinct from the TEST webhook secret.
