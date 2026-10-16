# Support form deployment

The home form sends through `/api/support` (Cloudflare Pages Functions).
It does not open the visitor's email client. Destination is fixed to
`suporte@nekumafinance.app`; Reply-To is the visitor's email.

Before publishing, configure Cloudflare Pages > nekuma-finance > Settings >
Variables and Secrets for Production:

- `RESEND_API_KEY`: secret, sending permission for the verified Nekuma domain.
- `TURNSTILE_SECRET_KEY`: secret for a Cloudflare Turnstile widget.
- `TURNSTILE_SITE_KEY`: public site key of the same widget.

Allow `nekumafinance.app` and `app.nekumafinance.app` on that widget.
Redeploy after configuring the variables. Never commit API keys.
Without configuration the endpoint fails closed and the form explains that
sending is unavailable. The static local preview cannot execute Functions.

Test both support links, complete verification, submit a real message, and
confirm arrival and Reply-To before considering email delivery validated.
Existing Cloudflare forwarding delivers support mail to nekumagrupo@gmail.com.

API references: https://resend.com/docs/api-reference/emails/send-email
and https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
