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
- Published: resume bound checkouts using GET and the provider's approve
  link, without replaying subscription creation. Only APPROVAL_PENDING can resume;
  binding, plan validation, user allowlist and Sandbox-only gates remain enforced.
- Mocked HTTP/SQL and UI regression tests pass; completed buyer approval and a
  verified PAYMENT.SALE.COMPLETED event remain unvalidated.

## Japan merchant isolation (2026-10-21)

- The user completed a standalone JP merchant/JP buyer Sandbox purchase for JPY
  480. The supplied PayPal confirmation shows subscription I-YS65LM14JGJM under
  diagnostic plan P-79L224394U314635UNLMJK5I. This was not started by the app and
  does not prove an app webhook or entitlement update. Do not import it as a
  customer-bound app checkout.
- v8 adds a server-selected merchant profile to Sandbox checkout reservations.
  Existing rows remain `legacy`; each user can also reserve one `jp` checkout.
  The original RPC signatures continue selecting only legacy records.
- Keep existing PAYPAL_SANDBOX_* settings unchanged. Add separate encrypted
  PAYPAL_JP_SANDBOX_CLIENT_ID, PAYPAL_JP_SANDBOX_CLIENT_SECRET,
  PAYPAL_JP_SANDBOX_WEBHOOK_ID, PAYPAL_JP_SANDBOX_PRO_PLAN_ID and
  PAYPAL_JP_SANDBOX_FAMILY_PLAN_ID settings. JP never falls back to legacy keys.
- Set PAYPAL_SANDBOX_PROFILE=jp only after approval, migration and publication.
  The ADMIN setup action prepares/reuses the normal PRO/Family catalog in the
  selected merchant; its returned setting names include the JP prefix. The
  manually created diagnostic product remains separate.
- Registered the JP app webhook at https://nekumafinance.app/api/paypal/jp-webhook
  with eleven lifecycle/sale events. Its ID is 2AF5717100760710F.
  The old /api/paypal/webhook route always uses legacy credentials, regardless
  of the active customer profile. Both enforce signature and binding checks.
- Required rollout order: approve/apply v8, publish code, configure separate JP
  keys/webhook and select JP, prepare catalog as ADMIN/AAL2, save returned JP
  plan IDs, redeploy, then initiate a new app-bound JP checkout. Never replace
  old bindings, replay the diagnostic purchase, or enable live billing here.
- v8 applied and audited in production: six users, one legacy checkout and one
  legacy event preserved; browser execution denied and server execution allowed.
- `wrangler.toml` selects the JP profile when the new code is published. JP keys
  and plan IDs must be configured; missing values fail closed without fallback.
- Local mock HTTP and disposable PostgreSQL tests cover merchant isolation,
  repeat migrations, retries, preservation of legacy receipts, profile spoofing,
  missing JP keys, cross-merchant webhook rejection and browser RPC denial.
  The user saved the three separate JP client ID, client secret and webhook ID
  settings in Cloudflare; encrypted entries were verified without opening values.
  The JP catalog was subsequently prepared, configured and deployed. The user
  completed the integrated checkout and reported one validated test receipt.

## Paid-period simulation (v9)

- v9 applied in Supabase on 2026-10-21. Audit confirmed six users preserved,
  authenticated table reads/RPC execution denied, service-role execution allowed.
- Apply `supabase-paypal-ledger-v9.sql` before publishing with
  `PAYPAL_SANDBOX_LEDGER_ENABLED=true`. Private periods and refund/reversal holds
  are server-only; commercial subscriptions and financial records are untouched.
- A simulated paid period requires a completed transaction with the expected JPY
  amount, matching the subscription's last payment and a valid next billing date.
  Approval or a receipt count alone never grants a period. Duplicate payment IDs
  cannot extend validity, and holds survive out-of-order payment events.
- The status endpoint can reconcile the latest payment within forty days on
  demand. This is not a scheduled reconciliation job or a full historical import.
  Missing provider billing dates do not produce invented validity periods.
- Cancelled subscriptions can retain an already recorded paid period without
  expected renewal. Suspended subscriptions do not show active simulation.
  Refunds, including partial refunds, and reversals place a conservative hold;
  automatic restoration after review is not implemented.
- The UI labels this explicitly as a simulated Sandbox plan. It does not unlock
  commercial features or modify the user's real Free/PRO/Family subscription.
- Run `node scripts/verify-paypal-ledger.cjs` for mock provider and disposable
  PostgreSQL checks. Production reconciliation/display still requires deployment
  and an authenticated status query; local tests are not live-payment evidence.
