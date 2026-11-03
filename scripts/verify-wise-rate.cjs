const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const source = fs.readFileSync('functions/api/wise/rate.js', 'utf8');
  const { onRequestPost } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const env = { WISE_RATE_TOKEN: 'fixture-secret', SUPABASE_URL: 'https://db.invalid', SUPABASE_ANON_KEY: 'anon' };
  const request = (query = 'source=USD&target=BRL', origin = 'https://app.nekumafinance.app', auth = true) => new Request('https://app.nekumafinance.app/api/wise/rate?' + query, {
    method: 'POST', headers: { Origin: origin, ...(auth ? { Authorization: 'Bearer fixture' } : {}) }
  });
  const original = global.fetch;
  let providerCalls = 0, rate = 5, authenticated = true;
  global.fetch = async (url, options) => {
    assert.equal(options.redirect, 'manual');
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'user' }), { status: authenticated ? 200 : 401 });
    providerCalls++;
    assert.equal(options.headers.Authorization, 'Bearer fixture-secret');
    assert.ok(url.startsWith('https://api.wise.com/2026Q4/rates?'));
    const pair = new URL(url).searchParams;
    return new Response(JSON.stringify([{ source: pair.get('source'), target: pair.get('target'), rate, time: new Date().toISOString() }]));
  };
  try {
    assert.equal((await onRequestPost({ request: request(), env: {} })).status, 503);
    assert.equal((await onRequestPost({ request: request('', 'https://evil.invalid'), env })).status, 403);
    assert.equal((await onRequestPost({ request: request(undefined, undefined, false), env })).status, 401);
    assert.equal((await onRequestPost({ request: request('source=BTC&target=BRL'), env })).status, 400);
    let response = await onRequestPost({ request: request(), env });
    let data = await response.json();
    assert.equal(data.rate, 5); assert.equal(data.affiliateUrl, null);
    assert.ok(!JSON.stringify(data).includes('fixture-secret'));
    await onRequestPost({ request: request(), env });
    assert.equal(providerCalls, 1);
    authenticated = false;
    assert.equal((await onRequestPost({ request: request(), env })).status, 401);
    authenticated = true;
    const approved = { ...env, WISE_AFFILIATE_APPROVED: 'true', WISE_AFFILIATE_URL: 'https://wise.prf.hn/click/camref:fixture' };
    data = await (await onRequestPost({ request: request(), env: approved })).json();
    assert.equal(data.affiliateUrl, approved.WISE_AFFILIATE_URL);
    data = await (await onRequestPost({ request: request(), env: { ...approved, WISE_AFFILIATE_URL: 'https://evil.invalid' } })).json();
    assert.equal(data.affiliateUrl, null);
    rate = -1;
    assert.equal((await onRequestPost({ request: request('source=JPY&target=BRL'), env })).status, 503);
    console.log('PASS: Wise authentication before cache, origin, currency allowlist, secret isolation, cache, affiliate gate and malformed rates. Mocked HTTP, not live API.');
  } finally { global.fetch = original; }
})().catch(error => { console.error(error); process.exitCode = 1; });
