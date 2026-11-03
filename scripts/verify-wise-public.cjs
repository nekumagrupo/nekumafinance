const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('functions/api/wise/public-rate.js', 'utf8');
let sequence = 0;
const load = () => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64') + '#' + sequence++);
const request = (suffix = '') => new Request('https://nekumafinance.app/api/wise/public-rate' + suffix);
(async () => {
  const original = global.fetch;
  let calls = 0;
  const env = { WISE_RATE_TOKEN: 'fixture-secret' };
  global.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.wise.com/2026Q4/rates?source=JPY&target=BRL');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Authorization, 'Bearer fixture-secret');
    return new Response(JSON.stringify([{ source:'JPY', target:'BRL', rate:.034723, time:new Date().toISOString() }]));
  };
  try {
    const api = await load();
    assert.equal((await api.onRequestGet({ request:request(), env:{} })).status, 503);
    assert.equal((await api.onRequestGet({ request:request('?source=USD'), env })).status, 400);
    assert.equal((await api.onRequestGet({ request:new Request('https://evil.invalid/api/wise/public-rate'), env })).status, 400);
    const responses = await Promise.all([1,2,3].map(() => api.onRequestGet({ request:request(), env })));
    assert.equal(calls, 1, 'Concurrent public queries must share one provider request');
    const data = await responses[0].json();
    assert.equal(data.rate, .034723);
    assert.deepEqual(Object.keys(data).sort(), ['rate','source','target','time']);
    assert.ok(!JSON.stringify(data).includes('fixture-secret'));
    await api.onRequestGet({ request:request(), env });
    assert.equal(calls, 1, 'Repeated queries must use cache');
    assert.match(responses[1].headers.get('Cache-Control'), /s-maxage=300/);
    for (const body of [[], [{ source:'JPY', target:'BRL', rate:-1, time:new Date().toISOString() }], [{ source:'JPY', target:'BRL', rate:1, time:'2020-01-01' }]]) {
      global.fetch = async () => new Response(JSON.stringify(body));
      const fresh = await load();
      const response = await fresh.onRequestGet({ request:request(), env });
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
    const page = fs.readFileSync('outputs/finance-pwa/index.html', 'utf8');
    assert.match(page, /data-wise-home-refresh/);
    assert.match(page, /data-wise-home-status aria-live="polite"/);
    assert.ok(!page.includes('wise.com/invite/'), 'Do not publish personal referral URL');
    console.log('PASS: public Wise fixed pair, host and query restrictions, coalescing, cache, sanitized response, invalid/stale data, missing token and accessible refresh. Mocked HTTP, not live deployment.');
  } finally { global.fetch = original; }
})().catch(error => { console.error(error); process.exitCode = 1; });
