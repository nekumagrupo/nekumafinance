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
      : { id: 'price_fixture', livemode: mode, active: true, type: 'recurring', currency: 'jpy',
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
    console.log('PASS: LIVE disabled by default; test credentials/responses rejected; merchant, payouts, JPY 480 monthly price and idempotency checked. Mocked HTTP only.');
  } finally { global.fetch = original; }
})().catch(error => { console.error(error); process.exitCode = 1; });
