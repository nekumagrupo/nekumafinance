# Wise converter setup

The converter queries Wise only after the signed-in user selects Consultar Wise.
It does not modify stored financial exchange rates or initiate transfers.
API rates are estimates excluding transfer fees. Failures preserve the previous
displayed amount. Responses identify the provider timestamp.

Cloudflare Production secret: WISE_RATE_TOKEN. Use the least-privileged read-only
token available for rates; never grant payment/transfer permissions for this feature.
The owner generates and enters it directly in Cloudflare, not in chat or source.
If read-only access is unavailable, stop and review the official widget alternative.
Redeploy after saving the secret. API access and eligibility must be verified live.

Optional production variables, only after commercial affiliate approval:
WISE_AFFILIATE_APPROVED=true and WISE_AFFILIATE_URL=<approved tracking URL>.
Only HTTPS wise.com / wise.prf.hn links are accepted. A personal referral URL is
not automatically enrolled. Without these settings, no referral CTA is displayed.

Endpoint: POST /api/wise/rate?source=USD&target=BRL with the current Supabase
Bearer session and same-origin Origin. Supported currencies: USD BRL JPY EUR GBP.
Rates cache for 60 seconds per worker instance, authenticated before cache access.
No account balance, profile, recipient or transfer endpoints are used.

Local verification: node scripts/verify-wise-rate.cjs
Reference: https://docs.wise.com/guides/product/send-money/quotes/affiliates

Public home preview: GET /api/wise/public-rate on nekumafinance.app only.
No session required. Fixed JPY -> BRL pair, no query parameters, no user account
data or referral configuration returned. Concurrent requests share an in-flight
lookup and the rate is cached for five minutes per worker instance; responses
also declare public cache lifetimes. Refresh errors retain the previous value
and its date. The static local preview does not execute Pages Functions.
Test: node scripts/verify-wise-public.cjs
