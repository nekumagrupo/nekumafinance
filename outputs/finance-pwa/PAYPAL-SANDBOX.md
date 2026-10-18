# PayPal Sandbox checkout

This first integration is a test-only payment transport. It never enables real
charges or changes commercial entitlements. Do not advertise payment as available.

## Deployment prerequisites

1. Review and apply `supabase-paypal-sandbox-v6.sql` after the existing migrations.
   Then apply `supabase-paypal-status-v7.sql` for the private status query.
   This requires separate approval before touching the production database.
2. After deployment, the ADMIN panel's "Preparar planos Sandbox" action requires
   ADMIN + AAL2 and creates/reuses the test product and plans. It returns their IDs
   for PAYPAL_SANDBOX_PRO_PLAN_ID and PAYPAL_SANDBOX_FAMILY_PLAN_ID in Cloudflare.
   This setup route needs only the Sandbox credentials and existing Supabase auth
   configuration, not the plan IDs it is preparing. Alternatively create manually:
   In the existing PayPal Sandbox app, create two ACTIVE monthly, unlimited-cycle
   REGULAR plans: PRO JPY 480 and Family JPY 850, without trial cycles, tax, setup
   fee or quantity pricing. The app already provides its own three-day trial.
3. Register `https://nekumafinance.app/api/paypal/webhook` in that same Sandbox app.
   Subscribe to PAYMENT.SALE.COMPLETED, PAYMENT.SALE.REFUNDED,
   PAYMENT.SALE.REVERSED, and BILLING.SUBSCRIPTION lifecycle events.
4. Set these Cloudflare Pages Production variables/secrets and redeploy:
   - PAYPAL_BILLING_MODE=sandbox
   - PAYPAL_SANDBOX_CLIENT_ID
   - PAYPAL_SANDBOX_CLIENT_SECRET (encrypted secret)
   - PAYPAL_SANDBOX_WEBHOOK_ID
   - PAYPAL_SANDBOX_PRO_PLAN_ID
   - PAYPAL_SANDBOX_FAMILY_PLAN_ID
   - PAYPAL_SANDBOX_TEST_USERS (comma-separated app user UUIDs)
   - SUPABASE_URL and SUPABASE_ANON_KEY (existing)
   - SUPABASE_SERVICE_ROLE_KEY (encrypted secret; never browser/source/chat)

PAYPAL_BILLING_MODE is explicitly set to sandbox in wrangler.toml. No live
endpoint exists in this billing integration. The legacy balance route is separate.

Plans contains a manual status query. The server authorizes the test user by UUID;
checkout buttons appear only after that verified response. Use a separate Sandbox
buyer, not the merchant. Status queries read the current subscription from PayPal
and the confirmed-receipt ledger from the database; ACTIVE alone does not prove
payment, and historical receipts do not imply current entitlement.
Returned approval/cancel URLs never grant access. Failed signatures are rejected;
completed sales must also appear in the subscription transactions API with the
expected gross JPY amount. Refunds/reversals are retained for review only.

## Operational boundaries

One persistent checkout per test user prevents parallel subscriptions and retries
use the same PayPal idempotency key. A checkout older than 48 hours requires manual
review: never delete its binding and create another without checking PayPal first.
Webhooks received before binding return 503 so PayPal can retry. Unknown signed
events are retained without changing access. Stored data is minimal (no card,
password, access token or full webhook payload). Sandbox audit uses UUID without
an auth-user FK and survives account removal; establish retention before launch.

Live release remains blocked. Next phase requires merchant eligibility, a verified
payment-period ledger, automatic entitlements, cancellation/renewal/refund handling,
reconciliation jobs, billing status UI and end-to-end Sandbox approval tests.
Home pricing/CTA must only become payable after that phase is validated.

Run `node scripts/verify-paypal-checkout.cjs` for mocked HTTP and disposable SQL
tests. These do not prove delivery of a real Sandbox webhook or completed checkout.
Run `node scripts/verify-paypal-ui.cjs` for user-bound status and rendering checks.

## Configuration progress (2026-10-18)

- v6/v7 applied to Supabase with six original users preserved; browser execution
  of private status functions denied, server execution granted.
- Webhook registered in the existing Sandbox app with subscription lifecycle,
  completed sale, refunded sale and reversed sale events.
- User saved encrypted Sandbox client credentials and the Supabase service-role
  key in Cloudflare. Values were not copied into source.
- Webhook ID and test user UUID allowlist saved as encrypted Cloudflare settings.
- Initial integration and upstream-error handling deployed; Sandbox PRO JPY 480
  and Family JPY 850 plans created and configured. An invalid service-role secret
  was replaced by the user; authenticated status queries now work.
- A subscription was created (HTTP 201) and its CREATED webhook was verified and
  stored. A fresh authenticated query still reports APPROVAL_PENDING and zero
  confirmed receipts. No paid entitlement or real charge has been enabled.
- Buyer approval loops back to PayPal login, including the user's external-browser
  test. Seller detail view also returned a generic PayPal error. These symptoms
  do not establish the root cause. The original request contains both return URLs.
- Pending publication: resume bound checkouts using GET and the provider's approve
  link, without replaying subscription creation. Only APPROVAL_PENDING can resume;
  binding, plan validation, user allowlist and Sandbox-only gates remain enforced.
- Mocked HTTP/SQL and UI regression tests pass; completed buyer approval and a
  verified PAYMENT.SALE.COMPLETED event remain unvalidated.
