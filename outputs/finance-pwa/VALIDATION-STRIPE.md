# Stripe validation and commercial terms

Review date: 2026-10-29 (Asia/Tokyo).

## Verified scope

Stripe TEST only. Production billing remains disabled. No approval or identity information was modified.

Provider tests performed in this conversation: successful checkout and PRO access; initial decline without paid access; paid monthly renewal; failed renewal and Free after expiry; cancellation of renewal retaining paid access; full refund removing paid access; invoice replay not clearing refund holds; dispute webhook delivered with HTTP 200 after identifier correction.

Read-only Supabase confirmation on 2026-10-29: charge ch_3UVTf2GU29o4WrPS3QDeN2Pb has a dispute hold; event evt_1UVTf6GU29o4WrPSvn9tA3RB is recorded; commercial_effective_plan for the authorized tester is free. The existing hold originated from invoice verification detecting the disputed charge; the later dispute event is independently recorded. HTTP 200 alone was not used as proof of access enforcement.

## Local checks rerun

All passed: verify-stripe-schema, verify-stripe-checkout, verify-stripe-webhook, verify-stripe-access, verify-stripe-cycles, verify-plan-api, verify-plan-refresh, verify-downgrade, check, verify-public-navigation and verify-commercial-terms.

These are mocked HTTP, VM/static checks and disposable PostgreSQL tests, not production settlement tests or an exhaustive security audit.

## Terms revised

terms.html now distinguishes the automatic 72-hour trial from paid subscriptions; states planned JPY 480 monthly pricing and current commercial unavailability; explains renewal cancellation, refunds, disputes, failed renewals, preserved records and mandatory consumer rights. Family remains unavailable publicly.

Official references reviewed:
- https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm (article 49)
- https://www.no-trouble.caa.go.jp/qa/advertising.html (Japanese distance-sale disclosures)

## Launch gates still open

- Merchant approval is handled by the owner; no conclusion about eligibility is made here.
- Implement isolated LIVE credentials, price, ledger and webhook. Existing billing deliberately accepts TEST only.
- Provide a working customer subscription-management/cancellation channel before enabling sales; terms do not claim that a portal already exists.
- Publish verified seller identification and legally required contact/address disclosures for the applicable markets. Do not invent identity, registration, address or telephone details. Owner/legal review required.
- Confirm total price/tax treatment and required disclosures in the final LIVE checkout, including consent and durable evidence of the accepted terms version.
- Verify LIVE webhook delivery, payment authentication (including 3DS where applicable), reconciliation/recovery, customer cancellation and notifications. Test-mode success is not LIVE approval.
- Review legal wording with qualified counsel before commercial launch. This document is an engineering review, not legal certification.

The changes in this review have not been published by this task.
