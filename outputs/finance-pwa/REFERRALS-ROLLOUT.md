# Referral rewards v17 - PREPARATION, NOT LIVE

## Production structure applied

Applied with owner approval on 2026-11-04 (Asia/Tokyo) to project
ysggihygadpfjyywtvyy. Program remains DISABLED. Read-only audit confirmed:
zero codes, zero credits, zero rewards, all existing effective plans preserved,
RLS on all six tables, no authenticated browser writes to credits and no browser
permission to record payments. No billing activation or financial-data changes.
Migration query: 7a90756d-315d-462c-8fcb-461a544f4f5e.
Audit query: 30d1c47d-aa36-433d-bf2c-efbe9f37db9f.
Repeatable audit: scripts/audit-referrals.sql.

Three distinct eligible first PRO monthly payments earn 300 points (100 each),
redeemable for 30 elapsed days of promotional PRO. No cash withdrawal.
New accounts must claim the link within 24 hours of creation. Only one referrer
per account. Codes are random, server-issued and not derived from user identity.

The SQL migration is disabled by default. No real accounts or plans have been
changed by preparing these files. No Sandbox payment can earn real points.

## Activation gates

1. Obtain explicit approval and stage/apply supabase-referrals-v17.sql after v16.
2. Finish isolated LIVE Stripe checkout, webhook and first-invoice verification.
3. The verified LIVE reconciler calls referral_record_payment only after checking
   canonical Stripe customer/user, invoice, charge, currency JPY, amount 480,
   first subscription invoice, payment success, refund and dispute state.
   Caller-provided browser values must never be forwarded into this RPC.
4. Schedule a server reconciliation after 14 days. Re-read provider state, then
   record a unique reconcile:<invoice>:<run> event. Merely aging a pending credit
   never approves it. All three credits must be verified within five minutes
   before redemption; the future server redemption endpoint must refresh them.
   The direct client RPC currently fails closed when those checks are stale.
5. Wire refund/dispute events and periodic recovery to reverse credits even after
   redemption. A reversal revokes the associated reward; other valid points in
   that revoked redemption return to the balance. Replays cannot clear holds.
6. Block LIVE checkout while promotional access is active or define a deferred
   billing start. Initial redemption is only for Free accounts with no active
   commercial paid period. Do not silently pause subscriptions or double-charge.
7. Add ADMIN/AAL2 review, suspicious-account/device/payment reuse controls, logs
   and support appeal flow. Distinct emails alone do not prevent multi-account
   fraud. Do not store raw card details or expose invitee names/emails.
8. Review commercial program terms, privacy disclosure, validation period,
   exclusions and unit economics. The point exchange is not yet advertised live.
9. Enable referral_settings only after end-to-end LIVE/staging QA and approval.

## Data safety

Private RLS tables with no browser grants. Own-dashboard and claim RPCs require
fresh authenticated identity and active account. Payment recording is strictly
service_role. Reward redemption serializes per referrer and checks current plan,
point availability and fresh verification. ADMIN manual overrides take priority.
Expiry is checked server-side; financial records are never deleted on downgrade.
The display no longer trusts old browser-local referralCredits or generated codes.
The program intentionally remains unavailable if the schema is absent or disabled.

## Tests

node scripts/verify-referrals.cjs runs disposable PostgreSQL, not live Stripe.
It covers disabled default, rerunnable migration, auth/ACLs, attribution, payment
binding, Sandbox rejection, duplicate events, points, redemption, paid-plan guard,
freshness, refund revocation and privacy. Provider fraud controls and LIVE billing
integration remain required; this is not a complete production launch.
