const assert = require('node:assert/strict');
const fs = require('node:fs');
const encode = value => 'data:text/javascript;base64,' + Buffer.from(value).toString('base64');

(async () => {
  const paypal = encode(fs.readFileSync('functions/_shared/paypal-billing.js', 'utf8'));
  const helper = encode(fs.readFileSync('functions/_shared/stripe-billing.js', 'utf8').replace('./paypal-billing.js', paypal));
  const load = async name => import(encode(fs.readFileSync('functions/api/stripe/' + name + '.js', 'utf8')
    .replace('../../_shared/stripe-billing.js', helper).replace('../../_shared/paypal-billing.js', paypal)));
  const checkout = await load('checkout');
  const status = await load('status');
  const env = { STRIPE_BILLING_MODE: 'test', STRIPE_TEST_SECRET_KEY: 'sk_test_fixture', STRIPE_TEST_USERS: 'user',
    SUPABASE_URL: 'https://db.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'server' };
  const original = global.fetch;
  let calls = 0, blocked = false, owner = 'user', live = false, amount = 480, destination = 'https://checkout.stripe.com/c/pay/test', bound = false, creations = 0;
  const json = value => new Response(JSON.stringify(value));
  global.fetch = async (url, options) => {
    assert.equal(options.redirect, 'manual');
    if (url.endsWith('/auth/v1/user')) return json({ id: 'user' });
    if (url.endsWith('/my_commercial_access')) return json({ enforcementActive: true, blocked });
    if (url.endsWith('/stripe_test_reserve')) return json({ id: 'reservation', user_id: 'user', plan: 'pro', created_at: new Date().toISOString(), session_id: bound ? 'cs_test_fixture' : null });
    if (url.endsWith('/stripe_test_bind')) { bound = true; return json(true); }
    assert.ok(url.startsWith('https://api.stripe.com/v1/checkout/sessions'));
    calls++;
    assert.equal(options.headers.Authorization, 'Bearer sk_test_fixture');
    if (options.method === 'POST') {
      creations++;
      const body = new URLSearchParams(options.body);
      assert.equal(body.get('line_items[0][price_data][currency]'), 'jpy');
      assert.equal(body.get('line_items[0][price_data][unit_amount]'), '480');
      assert.equal(body.get('line_items[0][price_data][recurring][interval]'), 'month');
      assert.equal(body.get('client_reference_id'), 'user');
      assert.equal(options.headers['Idempotency-Key'], 'nekuma-stripe-test-reservation');
    }
    return json({ id: 'cs_test_fixture', livemode: live, client_reference_id: owner, mode: 'subscription',
      currency: 'jpy', amount_total: amount, metadata: { nekuma_plan: 'pro', nekuma_user: owner },
      url: destination, status: 'open', payment_status: 'paid' });
  };
  const request = (body, origin = 'https://app.nekumafinance.app') => new Request(origin + '/api/stripe/checkout', {
    method: 'POST', headers: { Origin: origin, Authorization: 'Bearer fixture' }, body: JSON.stringify(body)
  });
  const body = { plan: 'pro', attempt: '12345678-1234-1234-1234-123456789012', amount: 1, currency: 'brl' };
  const run = (values = env, data = body, origin) => checkout.onRequestPost({ env: values, request: request(data, origin) });
  try {
    assert.equal((await run({ ...env, STRIPE_TEST_SECRET_KEY: 'sk_live_fixture' })).status, 503);
    assert.equal((await run({ ...env, STRIPE_TEST_USERS: '' })).status, 403);
    assert.equal((await run(env, body, 'https://evil.invalid')).status, 403);
    blocked = true; assert.equal((await run()).status, 403); blocked = false;
    assert.equal((await run(env, { ...body, plan: 'family' })).status, 400);
    assert.equal(calls, 0);
    const result = await run(); assert.equal(result.status, 200);
    assert.equal((await result.json()).grantsAccess, false);
    assert.equal((await run()).status, 200); assert.equal(creations, 1);
    live = true; assert.equal((await run()).status, 502); live = false;
    owner = 'other'; assert.equal((await run()).status, 403); owner = 'user';
    amount = 1; assert.equal((await run()).status, 403); amount = 480;
    destination = 'https://evil.invalid'; assert.equal((await run()).status, 502);
    const paid = await status.onRequestPost({ env, request: request({ sessionId: 'cs_test_fixture' }) });
    assert.equal(paid.status, 200); assert.equal((await paid.json()).grantsAccess, false);
    owner = 'other'; assert.equal((await status.onRequestPost({ env, request: request({ sessionId: 'cs_test_fixture' }) })).status, 403);
    console.log('PASS: Stripe test-only checkout, server-side JPY 480 monthly pricing, authenticated allowlist, blocked/origin checks, idempotency, owner binding, redirect validation, and no plan grants. Mocked HTTP, not live settlement.');
  } finally { global.fetch = original; }
})().catch(error => { console.error(error); process.exitCode = 1; });
