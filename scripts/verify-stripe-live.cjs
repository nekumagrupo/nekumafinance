const assert = require('node:assert/strict');
const fs = require('node:fs');
const encode = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');

(async () => {
  const paypal = encode(fs.readFileSync('functions/_shared/paypal-billing.js', 'utf8'));
  const live = await import(encode(fs.readFileSync('functions/_shared/stripe-live.js', 'utf8').replace('./paypal-billing.js', paypal)));
  const env = { STRIPE_LIVE_ENABLED: 'true', STRIPE_LIVE_SECRET_KEY: 'sk_live_fixture',
    STRIPE_LIVE_PRO_PRICE_ID: 'price_fixture', STRIPE_LIVE_ACCOUNT_ID: 'acct_fixture' };
  assert.throws(() => live.liveConfiguration({}), /indisponivel/);
  assert.throws(() => live.liveConfiguration({ ...env, STRIPE_LIVE_SECRET_KEY: 'sk_test_fixture' }), /incompleta/);
  assert.equal(live.liveConfiguration({ ...env, STRIPE_LIVE_SECRET_KEY: 'rk_live_fixture' }).key,'rk_live_fixture');
  const original = global.fetch;
  let amount = 480, mode = true, account = 'acct_fixture', payouts = true, trial = null;
  global.fetch = async (url, options) => {
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Authorization, 'Bearer sk_live_fixture');
    const body = url.endsWith('/account') ? { id: account, charges_enabled: true, payouts_enabled: payouts }
      : { id: url.split('/').at(-1), livemode: mode, active: true, type: 'recurring', currency: 'jpy',
        unit_amount: amount, billing_scheme: 'per_unit', recurring: {
          interval: 'month', interval_count: 1, usage_type: 'licensed', trial_period_days: trial } };
    return new Response(JSON.stringify(body));
  };
  try {
    assert.equal((await live.verifyLiveCatalog(env)).unit_amount, 480);
    amount = 1; await assert.rejects(live.verifyLiveCatalog(env), /divergente/); amount = 480;
    mode = false; await assert.rejects(live.verifyLiveCatalog(env), /ambiente LIVE/); mode = true;
    account = 'acct_other'; await assert.rejects(live.verifyLiveCatalog(env), /nao liberada/); account = 'acct_fixture';
    payouts = false; await assert.rejects(live.verifyLiveCatalog(env), /nao liberada/); payouts = true;
    trial = 3; await assert.rejects(live.verifyLiveCatalog(env), /divergente/); trial = null;
    await assert.rejects(live.liveStripe(env, 'checkout/sessions', { mode: 'subscription' }), /idempotencia/);
    await assert.rejects(live.liveStripe(env, 'https://evil.invalid'), /invalida/);
    const user = { id: '569ccf01-6360-479e-8117-28dcdfba2335' };
    const restricted = { ...env, STRIPE_LIVE_PUBLIC: 'false', STRIPE_LIVE_VALIDATION_ENABLED: 'true',
      STRIPE_LIVE_VALIDATION_USER: user.id, STRIPE_LIVE_VALIDATION_PRICE_ID: 'price_validation' };
    assert.equal(live.liveCheckoutOffer(restricted, user).amount, 100);
    amount = 100;
    assert.equal((await live.verifyLiveCatalog(restricted, user)).id, 'price_validation');
    amount = 480;
    await assert.rejects(live.verifyLiveCatalog(restricted, user), /divergente/);
    assert.equal(live.liveCheckoutOffer({ ...restricted, STRIPE_LIVE_PUBLIC: 'true' }, user).amount, 480);
    assert.equal(live.liveCheckoutOffer({ ...restricted, STRIPE_LIVE_VALIDATION_ENABLED: 'false' }, user).amount, 480);
    assert.throws(() => live.liveCheckoutOffer(restricted, { id: 'other' }), /restrita/);
    assert.throws(() => live.liveCheckoutOffer({ ...restricted, STRIPE_LIVE_VALIDATION_PRICE_ID: '' }, user), /restrita/);
    const session = { id: 'cs_live_validation', livemode: true, mode: 'subscription',
      client_reference_id: user.id, currency: 'jpy', amount_total: 100,
      metadata: { nekuma_user: user.id, nekuma_plan: 'pro', nekuma_validation_price: 'price_validation' } };
    assert.equal(live.validateLiveSession(session, user, restricted).amount, 100);
    assert.equal(live.validateLiveSession(session, user, { ...restricted, STRIPE_LIVE_VALIDATION_ENABLED: 'false', STRIPE_LIVE_PUBLIC: 'true' }).amount, 100);
    assert.throws(() => live.validateLiveSession(session, user, env), /nao autorizada/);
    assert.throws(() => live.validateLiveSession({ ...session, amount_total: 480 }, user, restricted), /divergente/);
    assert.throws(() => live.validateLiveSession({ ...session, metadata: { ...session.metadata, nekuma_validation_price: undefined } }, user, restricted), /divergente/);
    assert.throws(() => live.validateLiveSession(session, { id: 'other' }, restricted), /nao autorizada/);
    console.log('PASS: LIVE merchant/payouts, JPY 480 catalog, private JPY 100 owner/price binding, public rollout and retained refund validation. Mocked HTTP only.');
  } finally { global.fetch = original; }
})().catch(error => { console.error(error); process.exitCode = 1; });
