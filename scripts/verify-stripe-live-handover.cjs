const assert = require('node:assert/strict');
const fs = require('node:fs');
const encode = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
(async () => {
  const paypal = encode(fs.readFileSync('functions/_shared/paypal-billing.js', 'utf8'));
  const live = await import(encode(fs.readFileSync('functions/_shared/stripe-live.js', 'utf8').replace('./paypal-billing.js', paypal)));
  const current = '95a49cd7-2ee6-4b44-9156-b2e3327edc02';
  const previous = 'e98505de-a741-4acf-8e12-9f177e789d02';
  const env = { STRIPE_LIVE_ENABLED: 'true', STRIPE_LIVE_PUBLIC: 'false', STRIPE_LIVE_SECRET_KEY: 'sk_live_fixture',
    STRIPE_LIVE_ACCOUNT_ID: 'acct_fixture', STRIPE_LIVE_PRO_PRICE_ID: 'price_regular',
    STRIPE_LIVE_VALIDATION_ENABLED: 'true', STRIPE_LIVE_VALIDATION_USER: current,
    STRIPE_LIVE_VALIDATION_HISTORY_USERS: previous, STRIPE_LIVE_VALIDATION_PRICE_ID: 'price_validation',
    STRIPE_LIVE_VALIDATION_SUPERSEDED_SESSION: 'cs_live_previous' };
  const session = { id: 'cs_live_previous', livemode: true, status: 'open', payment_status: 'unpaid',
    client_reference_id: previous, mode: 'subscription', currency: 'jpy', amount_total: 100,
    metadata: { nekuma_user: previous, nekuma_plan: 'pro', nekuma_validation_price: 'price_validation' } };
  const original = global.fetch;
  let expired = false, posts = 0;
  global.fetch = async (url, options) => {
    if (options.method === 'POST') {
      assert.ok(url.endsWith('/checkout/sessions/cs_live_previous/expire'));
      assert.equal(options.headers['Idempotency-Key'], 'nekuma-live-expire-cs_live_previous');
      assert.equal(options.body, '');
      posts++; expired = true;
    } else assert.ok(url.endsWith('/checkout/sessions/cs_live_previous'));
    return new Response(JSON.stringify({ ...session, status: expired ? 'expired' : session.status }));
  };
  try {
    assert.equal(live.validateLiveSession(session, { id: previous }, env).amount, 100);
    assert.throws(() => live.liveCheckoutOffer(env, { id: previous }), /restrita/);
    await assert.rejects(live.expireSupersededValidation(env, { id: previous }), /nao autorizado/);
    await assert.rejects(live.expireSupersededValidation({ ...env, STRIPE_LIVE_PUBLIC: 'true' }, { id: current }), /nao autorizado/);
    session.payment_status = 'paid';
    await assert.rejects(live.expireSupersededValidation(env, { id: current }), /revisao/); assert.equal(posts, 0);
    session.payment_status = 'unpaid'; session.status = 'complete';
    await assert.rejects(live.expireSupersededValidation(env, { id: current }), /revisao/); assert.equal(posts, 0);
    session.status = 'open'; session.amount_total = 480;
    await assert.rejects(live.expireSupersededValidation(env, { id: current }), /divergente/); assert.equal(posts, 0);
    session.amount_total = 100;
    await assert.rejects(live.expireSupersededValidation({ ...env, STRIPE_LIVE_VALIDATION_HISTORY_USERS: '' }, { id: current }), /substituida/);
    await live.expireSupersededValidation(env, { id: current }); assert.equal(posts, 1);
    await live.expireSupersededValidation(env, { id: current }); assert.equal(posts, 1);
    assert.equal(live.liveCheckoutOffer(env, { id: current }).amount, 100);
    console.log('PASS: exact unpaid checkout expiry, configured previous owner, no paid/complete session changes, retry safety and historical validation without new purchase access. Mocked HTTP.');
  } finally { global.fetch = original; }
})().catch(error => { console.error(error); process.exitCode = 1; });
