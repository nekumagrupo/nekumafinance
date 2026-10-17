# Commercial foundation - phase 1

## Production Database Status - 2026-10-17 (Asia/Tokyo)

With explicit user authorization, commercial v1 and admin-management v2 were
applied to Supabase project `ysggihygadpfjyywtvyy` through its SQL editor.
The existing verified Google account `nekumagrupo@gmail.com` was reused:
`569ccf01-6360-479e-8117-28dcdfba2335`. Exactly one admin was granted and audited.
No duplicate Auth account was created. No password was entered or changed.

Before/after checks: 6 Auth users, 6 saved financial states; after migration,
6 personal subscription rows and 1 admin. Direct authenticated UPDATE on
subscriptions/overrides and anonymous admin RPC execution all returned false.
Read-only transactional SQL checks (rollback) verified AAL1 rejection and admin
overview/detail RPC output under the authenticated role with test claims.
This checks SQL authorization, not an actual MFA sign-in or JWT validation.

A password recovery was requested from the Supabase dashboard for the existing
Google identity. Delivery and user-defined password setup remain unconfirmed.
Next: owner completes password setup, signs in to the local admin panel, enrolls
and verifies TOTP personally, then checks real UI data. Frontend deployment and
the optional admin subdomain are still pending. Module enforcement remains off.

## Admin editing - v2

Apply `supabase-admin-management-v2.sql` after commercial v1 in staging, then run
`scripts/test-admin-staging.sql`. This adds:

- Editing display name, with optimistic concurrency and an audit reason.
- Manual Free/PRO/Family access overrides, separately from subscriptions/payment
  history. PRO/Family need an expiry; removing the override restores automatic
  subscription access. Overrides take precedence until expiration/removal.
- Every edit logs actor UUID, target, reason, old/new name and access state.
- Per-user storage is the JSON size of their shared households; it is not an
  exclusive per-user database bill. Shared data appears for each participant.
- Password management is a recovery email, not direct password editing. An
  admin+AAL2 RPC authorizes/logs the request, returns the stored target email and
  limits requests to one per admin per minute. The browser then calls Supabase's
  recovery endpoint with the existing official app reset URL. A successful request
  is not proof of email delivery; the password is never read or shown.

Requested admin identity: `nekumagrupo@gmail.com`. Use Supabase Authentication to
invite/create that user if absent (do not duplicate an existing identity). The
owner must set the password themselves and confirm the email. After reviewing
the exact account and authorizing admin access, run
`scripts/provision-nekuma-admin.sql`. It refuses missing, duplicate or unconfirmed
accounts, grants by resolved UUID, and does not set a password or change a plan.
No automatic admin grant exists in signup, user metadata, or the browser.

SQL runtime tests were executed in disposable PostgreSQL/WASM (PGlite 0.5.10),
with a minimal simulated Supabase Auth schema. They passed v1/v2 repeated
application, permission/MFA checks, manual overrides, expiry, stale edits, audit,
recovery authorization and the exact-email bootstrap. This is not a test of the
real GoTrue service, SMTP delivery, or production schema triggers.

To reproduce without changing app dependencies:

```powershell
npm install --prefix tmp/commercial-qa --no-save --package-lock=false @electric-sql/pglite@0.5.10
node scripts/verify-admin-postgres.cjs
```

## Implemented locally

- Canonical Free / PRO / Family catalog and personal subscriptions in Supabase.
- 3-day PRO trial for new accounts, anchored to signup, not browser time.
- Existing accounts backfilled as Free, without removing financial records.
- Read-only admin page at `/admin.html`: users, personal subscriptions, households,
  JSON financial state storage. No transaction contents are returned.
- Admin allowlist by UUID, checked in SQL. Admin data RPC additionally requires
  a Supabase Auth AAL2 session. The page supports user-driven TOTP enrollment.
- Private subscription writes, service-role-only audited and idempotent event RPC.
- App plan page reads own access from SQL. Old local plan selector no longer
  writes `state.commercial.plan`. The legacy field is retained as inert data.

## Remaining Commercial Work

Plan enforcement was subsequently activated by v5 (details at the end of this
document). The frontend and Cloudflare function updates still need deployment.

- Run a full authenticated staging walkthrough before enabling public checkout.
- Add verified provider webhooks, validate payer/user/product/amount/currency,
  handle out-of-order provider events and reconcile against provider state. The
  event RPC is not itself a payment verifier. Never expose a service-role key.
- Add checkout, cancellation management, refunds and payment history.
- Update public home pricing to 3 plans before sales; home currently advertises
  family features inside PRO. No checkout should be enabled while inconsistent.
- Usage metering (active time, scans, transfer, receipt storage), privacy notice,
  retention and multilingual commercial text validation.

## Staging validation

1. Back up and use a separate project with the current financial schema.
2. Apply `supabase-commercial-v1.sql` via SQL editor.
3. Run `scripts/test-commercial-staging.sql` in that staging project's SQL editor.
   This is a transactional fixture test with rollback, not a production test.
4. Test an ordinary account cannot call admin RPC or change subscription tables.
5. Select the administrator's UUID in Authentication > Users. In SQL editor:

```sql
-- Replace the placeholder with the exact administrator UUID, not an email.
insert into public.commercial_admins(user_id)
values ('REPLACE_WITH_ADMIN_UUID'::uuid)
on conflict do nothing;
```

6. Open `/admin.html` directly and log in on the ADMIN page itself. It uses its own
   Supabase auth storage key (`nekuma-admin-auth-v1`) and never redirects to the
   financial application. Sign-out is local to that session. Enroll and verify the
   authenticator yourself. Supabase dashboard MFA is separate from application MFA.
7. Verify ordinary user / admin AAL1 / admin AAL2, expired trials, canceled paid
   periods, expired paid periods and duplicate events.
8. Confirm users cannot see each other's subscriptions and no financial content
   is present in admin responses. Confirm paging, sign-out and empty states.

Local checks: `node scripts/verify-commercial.cjs` and `npm run check`.
The Node tests use mocks and static SQL contract checks; they do not replace
Supabase staging execution. A disposable PostgreSQL/WASM harness is available
via `scripts/verify-admin-postgres.cjs` as described above.

## Deployment order

After staging passes: apply reviewed production migration, explicitly allowlist
the admin UUID, then publish frontend via the existing GitHub/Cloudflare flow.
Never run the schema reset script. Do not delete or rewrite existing app states.
Enforcement and payment activation need their own tested rollout before sales.

## Independent admin routing

- There is no administration link inside the financial app.
- Local preview: `http://127.0.0.1:4181/admin.html`.
- After deployment: `https://nekumafinance.app/admin` is a separate administrative
  entry point, not a financial dashboard tab. `/admin` requests on the app host
  redirect here and never to `/app`.
- Optional `admin.nekumafinance.app` is supported by middleware. Its root opens
  `/admin`; financial app routes and APIs return 404 on this host, except the
  authenticated `/api/admin/delete-user` administrative endpoint. The custom
  domain still needs to be added and activated in Cloudflare before using it.
- The catch-all homepage rewrite was removed. Missing pages must not silently
  display the public home or app.
- The page queries `my_commercial_access` and `commercial_admin_overview` in the
  configured Supabase, not browser financial state or fabricated metrics. Missing
  migration is an explicit error. Production access still requires staged SQL
  validation and an explicit administrator UUID allowlist entry.

## Family access and user lifecycle (v3)

- `supabase-family-commercial-v3.sql` requires v1/v2 plus the household schema.
  Applied to production on 2026-10-17 with the owner's explicit authorization.
  No account deletion was performed; pre/post checks retained 6 users and 6 states.
- Personal signup stores `display_name` and `name` in Auth metadata. Family
  signup is replaced by an optional invitation to join a paying Family owner.
  Email signups retain the pending invitation locally until authenticated login;
  Google signup retains it in the OAuth pending session. The server validates it.
- Only an effective paid/manual Family owner can configure family names or
  generate invitations. Family guests are sponsored, not independent subscribers.
  Invitations lock the household row and enforce 5 total members including owner.
- Free/PRO settings contain no family management. The single Family settings
  card includes name, household leader, members, roles and owner-only invitation.
  A sponsored member's entitlement is scoped to the active family workspace.
- On expiry, members lose shared access; owners retain their existing workspace.
  Membership/financial records are not deleted on downgrade. Legacy manual family
  member/business lists cannot be changed without Family; existing lists persist.
- Commercial upgrade notifications are server-generated for confirmed active
  subscriptions or manual access grants. Renewals do not duplicate the notice.
  Read markers remain per-user in the browser; they are not synced across devices.
  The financial app refreshes commercial access during auto-sync, at most once/minute.
- Account deletion requires the independent ADMIN session, allowlist + AAL2,
  exact-email confirmation and a reason. It uses Auth Admin API on the server,
  never SQL deletes initiated directly by a browser. Self/admin deletions and
  shared household owners are blocked. A database trigger cleans up only owned,
  single-member workspaces within the Auth deletion transaction. Unreviewed links
  to other financial rows block deletion and roll back cleanup. No shared records
  are intentionally removed. Storage ownership can also prevent Auth deletion.
- Add `SUPABASE_SERVICE_ROLE_KEY` as an encrypted production Cloudflare Pages
  secret to activate deletion. This secret is NOT configured by these local
  changes. Existing `SUPABASE_URL` / `SUPABASE_ANON_KEY` must match the same project.
  Never paste that secret into chat, source, `supabase-config.js` or GitHub.
- Publish frontend/functions through the existing GitHub deployment. Actual
  MFA login and Auth deletion still need end-to-end staging verification. The
  local PostgreSQL tests use a mock Auth schema, not Supabase's full Auth/Storage.
- Payments are still disconnected. `apply_commercial_event` is a protected sink,
  not a webhook verifier. Gateway signature checks, ordering and reconciliation
  must be implemented before enabling automatic purchases.

Checks: `node scripts/verify-family-ui.cjs`, `node scripts/verify-admin-delete.cjs`,
`node scripts/verify-admin-postgres.cjs`, `node scripts/verify-commercial.cjs`,
`node scripts/verify-domain-routing.cjs`, `npm run check` and deployment build.

## Administrative operations (v4)

`supabase-admin-operations-v4.sql` follows v3. Validate in disposable PostgreSQL
with `scripts/test-admin-operations-staging.sql` before applying to production.
This migration does not automatically block, expire, merge or delete any account.

Applied to production project `ysggihygadpfjyywtvyy` on 2026-10-17 (Asia/Tokyo)
with explicit owner authorization. Re-ran disposable PostgreSQL tests first.
Post-application checks: 6 users, 6 financial states, 6 unique email keys,
0 blocked accounts, 15 restrictive policies. Anonymous block execution and direct
authenticated updates to block controls are denied. A rollback-only SQL check
under the ordinary authenticated role confirmed its one financial state remains
readable and the administrative block action is denied. No real account was
blocked/unblocked or deleted for testing.

The already-authenticated local ADMIN session refreshed successfully against the
real RPC: 6 active, 0 expired, 0 blocked, 0 trials; PostgreSQL reported 12.65 MiB.
This also confirms an actual AAL2 administrator session reached the protected
overview. Screenshot: `work/admin-operations-v4-active.png`. Frontend/functions
have not been published to GitHub/Cloudflare by this operation. Account deletion
still requires the separate server secret described above.

- Six KPIs: total users, active accounts, expired periods, blocked accounts,
  ongoing trials and actual PostgreSQL database size (`pg_database_size`). The
  last value includes indexes/system tables, not Storage files or network usage.
  A database size query failure yields unavailable, not a fabricated zero.
- Active/expired/trial/blocked are exclusive categories. Active means an unblocked
  account outside an ongoing trial or expired period, not online presence.
  Expired users retain Free features unless administratively blocked. Expiry uses
  valid manual grants first, then the subscription, or the sponsor's paid period.
- The eight-column table exposes no password or hash, only a password-recovery
  action. Family counts refer to distinct other users linked to owned households,
  not the number of storage workspaces. Guests are labeled as linked members.
- Blocks/unblocks require ADMIN + AAL2 and an audit reason. Self/admin blocking
  is denied. This is application access suspension, not cancellation of payments
  or a Supabase Auth credential ban. Restrictive financial RLS and definer-RPC
  guards enforce suspension even for an already-issued access token. The app
  shows suspension on the next server sync; previously downloaded offline data
  cannot be remotely erased from a disconnected device.
- Auth already assigns a UUID. A private email-key table additionally guarantees
  one normalized (`lower(trim(email))`) email per UUID on insert/email update.
  Concurrent duplicates fail transactionally. Backfill fails safely on existing
  duplicates, never merges or removes records. No public email-existence API is
  exposed. Managed Auth retains identity linking/verification responsibilities.
- Lifecycle metadata cleanup participates in the Auth deletion transaction and
  rolls back if existing financial deletion protections reject the operation.
- Reapplying v3 after v4 would overwrite wrapper enforcement. Use migrations in
  version order; do not replay earlier migrations after this one.

## Plan Enforcement v5

Applied `supabase-plan-enforcement-v5.sql` to production on 2026-10-17 after
explicit authorization. No existing financial rows were deleted or plans changed.
Use migrations v1-v5 in order. Do not replay older definitions afterward.

- Free: 1 registered bank account, 1 income source, 1 active goal (including the
  emergency reserve), 2 category budgets per month. Existing excess rows may be
  edited or removed; new rows/reactivations must meet the quota. Owned workspaces
  share these quotas. Monthly comparison and manual crypto remain available.
- PRO: unlimited basic resources, 30 receipt submissions per Japan calendar month,
  advanced individual charts/projections, automation, cards, investments/debts,
  MetaMask and Binance. Family sharing remains unavailable.
- Family: PRO resources plus up to 5 total members and 60 shared scan submissions
  per month. Valid trials and manual ADMIN grants use the same entitlement rules.
- The app_states trigger enforces quotas on RPC saves and direct table writes.
  Plans stored in financial JSON cannot unlock resources. Existing premium rows
  remain readable/exportable/removable after downgrade, not editable/addable.
- Scan reservation is atomic and precedes the model call. Valid submissions
  consume quota even if recognition/provider processing fails. Invalid formats,
  unauthorized accounts and exhausted quotas never invoke the model.
- Cloudflare scan/Binance endpoints require a verified current server entitlement;
  unavailable permissions fail closed. Free users may disconnect Binance keys.
  Client-only charts/public-wallet computations are UI entitlements, not DRM on
  a user's exportable raw financial data.

Checks: `npm run check`, `node scripts/verify-commercial.cjs`,
`node scripts/verify-family-ui.cjs`, `node scripts/verify-admin-postgres.cjs`,
`node scripts/verify-plan-api.cjs`, `node scripts/verify-binance.cjs`.
PostgreSQL tests use a disposable schema; API tests mock Auth and model providers.
Payment checkout/webhook activation is a separate unfinished integration.
Frontend and Cloudflare functions still require publication; SQL activation alone
does not update the deployed UI or old deployed integration endpoints.
Production verification: 6 users and 6 financial states preserved; plan trigger
active; authenticated direct quota UPDATE denied; authenticated reservation RPC
granted; anonymous reservation denied. Proof: `work/plan-enforcement-v5-active.png`.
No real paid upgrade, user block or scan submission was performed for testing.

## Downgrade Login and Capacity Follow-up

Login no longer treats a rejected plan-limited reconciliation save as failed
authentication. Unsynced local changes are retained and marked pending so an
automatic pull cannot replace them. Other connection/authorization failures still
propagate. Restricted records that only differ because of client normalization
are serialized in their original server format; actual edits still reach the
server plan guard. No migration, plan change or account deletion is needed.
Regression: `node scripts/verify-downgrade.cjs` (VM and mocked persistence).

ADMIN badges use the database `is_admin` field, not an email string comparison.
The authenticated administrator identity appears above the overview. Capacity
shows measured PostgreSQL bytes converted to decimal MB alongside a clearly
labeled 500 MB Supabase Free reference, remaining space, percent and warnings
at 80%/95%. This is not a billing-plan API integration. Storage, egress, monthly
active users and Resend counters are explicitly unavailable; provider links and
published Free allowances are references, never fabricated consumption totals.
References checked 2026-10-17:
https://supabase.com/docs/guides/platform/billing-on-supabase
https://resend.com/pricing

## Provider Monitor (Cloudflare)

New POST `/api/admin/usage` is limited to the main/admin official host and same
Origin. Every request invokes the protected ADMIN+AAL2 overview RPC before any
provider query or cache access. Only aggregate numbers are returned, never user
rows, provider response bodies, credentials or logs. Browser responses use
no-store; successful provider aggregates are cached server-side for 5 minutes,
failures for 30 seconds. Missing data stays unavailable, not zero.

Production secrets (user must generate, enter and save directly in Cloudflare):
- `RESEND_USAGE_API_KEY`: separate Resend Full Access key. GET api.resend.com/usage
  returns account-wide email used/limit/remaining and reset timestamps, including
  daily/monthly windows. Existing support/SMTP sending keys stay unchanged.
- `SUPABASE_USAGE_TOKEN`: Management API token scoped to the Nekuma project with
  `analytics_usage_read`, if fine-grained scopes are available. Requests use only
  GET /v1/projects/{ref}/analytics/endpoints/usage.api-counts. Returned bucket
  timestamps are displayed as the measured interval. These request counts are
  NOT monthly billed egress bytes, Storage bytes, MAU or billing allowances.

The PostgreSQL size continues to come from the existing protected overview RPC;
the 500 MB maximum remains an explicit Free reference rather than an API billing
allowance. Other billing usage still requires the provider's own dashboard.
Secret creation/insertion and code publication are pending, not completed.
Local `scripts/preview-home.cjs` is static and does not emulate Pages Functions;
the authenticated live monitor can only be tested after Cloudflare deployment.

Test: `node scripts/verify-admin-usage.cjs` (mocked Auth RPC/providers), plus check,
commercial UI tests and production build. No real email was sent or token created.
API references checked 2026-10-17:
https://www.resend.com/docs/api-reference/usage/retrieve-usage
https://supabase.com/docs/reference/api/v1-get-project-usage-api-count
