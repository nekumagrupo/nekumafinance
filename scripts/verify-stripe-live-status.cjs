const assert = require('node:assert/strict');
const fs = require('node:fs');
const encode = value => 'data:text/javascript;base64,' + Buffer.from(value).toString('base64');
(async () => {
  const paypal = encode(fs.readFileSync('functions/_shared/paypal-billing.js', 'utf8'));
  const live = encode(fs.readFileSync('functions/_shared/stripe-live.js', 'utf8').replace('./paypal-billing.js', paypal));
  const status = await import(encode(fs.readFileSync('functions/api/stripe/live-status.js', 'utf8')
    .replace('../../_shared/stripe-live.js', live).replace('../../_shared/paypal-billing.js', paypal)));
  const user = '569ccf01-6360-479e-8117-28dcdfba2335';
  const env = { STRIPE_LIVE_ENABLED: 'true', STRIPE_LIVE_PUBLIC: 'false', STRIPE_LIVE_USERS: user,
    STRIPE_LIVE_SECRET_KEY: 'sk_live_fixture', STRIPE_LIVE_ACCOUNT_ID: 'acct_fixture',
    STRIPE_LIVE_PRO_PRICE_ID: 'price_regular', STRIPE_LIVE_VALIDATION_ENABLED: 'true',
    STRIPE_LIVE_VALIDATION_USER: user, STRIPE_LIVE_VALIDATION_PRICE_ID: 'price_validation',
    SUPABASE_URL: 'https://db.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'server' };
  const original = global.fetch;
  let bound = false;
  const json = value => new Response(JSON.stringify(value));
  global.fetch = async url => {
    if (url.endsWith('/auth/v1/user')) return json({ id: user });
    if (url.endsWith('/my_commercial_access')) return json({ enforcementActive: true });
    if (url.endsWith('/stripe_live_lookup')) return json(bound ? { id: 'reserve', session_id: 'cs_live_fixture' } : null);
    if (url.endsWith('/stripe_live_entitlement')) return json({ active: bound, paidUntil: bound ? '2026-12-20T00:00:00Z' : null });
    if (url.endsWith('/checkout/sessions/cs_live_fixture')) return json({ id: 'cs_live_fixture', livemode: true,
      client_reference_id: user, mode: 'subscription', currency: 'jpy', amount_total: 100,
      metadata: { nekuma_user: user, nekuma_plan: 'pro', nekuma_validation_price: 'price_validation' },
      customer: 'cus_fixture', subscription: 'sub_fixture' });
    if (url.endsWith('/subscriptions/sub_fixture')) return json({ id: 'sub_fixture', livemode: true,
      metadata: { nekuma_user: user }, customer: 'cus_fixture', status: 'active', cancel_at_period_end: true });
    throw Error('Unexpected URL ' + url);
  };
  const run = async () => {
    const response = await status.onRequestPost({ env, request: new Request('https://app.nekumafinance.app/api/stripe/live-status', {
      method: 'POST', headers: { Origin: 'https://app.nekumafinance.app', Authorization: 'Bearer fixture' }, body: '{}' }) });
    assert.equal(response.status, 200);
    return response.json();
  };
  try {
    let result = await run();
    assert.equal(result.amount, 100); assert.equal(result.validation, true); assert.equal(result.hasSubscription, false);
    env.STRIPE_LIVE_PUBLIC = 'true';
    result = await run(); assert.equal(result.amount, 480); assert.equal(result.validation, false);
    bound = true; env.STRIPE_LIVE_VALIDATION_ENABLED = 'false';
    result = await run();
    assert.equal(result.amount, 100); assert.equal(result.active, true); assert.equal(result.renewalCancelled, true);
    console.log('PASS: private offer, public JPY 480, existing JPY 100 subscription and cancellation status after rollout. Mocked HTTP.');
  } finally { global.fetch = original; }
})().catch(error => { console.error(error); process.exitCode = 1; });
