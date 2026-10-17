const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
async function load(path) {
  const source = buildSync({ entryPoints: [path], bundle: true, write: false, format: 'esm', platform: 'neutral' }).outputFiles[0].text;
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}
(async () => {
  const scan = await load('functions/api/receipt-scan.js');
  const binance = await load('functions/api/binance.js');
  const original = global.fetch;
  let plan = 'free', blocked = false, available = true, reserved = 0, aiCalls = 0, failAI = false, storageCalls = 0;
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status });
  const env = { SUPABASE_URL: 'https://auth.invalid', SUPABASE_ANON_KEY: 'public',
    AI: { async run() { aiCalls++; if (failAI) throw Error('provider'); return { response: { merchant: 'Store', total: 100, currency: 'JPY' } }; } },
    BINANCE_DB: { prepare() { storageCalls++; return { bind() { return this; }, async run() { return {}; } }; } } };
  const request = (image = 'data:image/png;base64,aGVsbG8=') => new Request('https://app.invalid/api/receipt-scan', {
    method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify({ image, plan: 'family' })
  });
  try {
    global.fetch = async url => {
      const path = new URL(url).pathname;
      if (path === '/auth/v1/user') return json({ id: 'user' });
      if (path === '/rest/v1/rpc/my_commercial_access') return available ? json({ plan, blocked, enforcementActive: true, limits: { features: plan === 'free' ? [] : ['receipt_scan','binance'] } }) : json({}, 503);
      if (path === '/rest/v1/rpc/reserve_commercial_scan') return reserved >= 30 ? json({ message: 'SCAN_LIMIT' }, 400) : json({ used: ++reserved, limit: 30 });
      throw Error('Unexpected request: ' + path);
    };
    assert.equal((await scan.onRequest({ request: request(), env })).status, 403);
    assert.equal(reserved, 0); assert.equal(aiCalls, 0);
    plan = 'pro'; blocked = true;
    assert.equal((await scan.onRequest({ request: request(), env })).status, 403);
    blocked = false; available = false;
    assert.equal((await scan.onRequest({ request: request(), env })).status, 503);
    available = true;
    assert.equal((await scan.onRequest({ request: request('invalid'), env })).status, 400);
    assert.equal(reserved, 0);
    const success = await scan.onRequest({ request: request(), env });
    assert.equal(success.status, 200); assert.equal((await success.json()).usage.used, 1);
    failAI = true;
    assert.equal((await scan.onRequest({ request: request(), env })).status, 502);
    assert.equal(reserved, 2, 'Provider attempts remain counted');
    reserved = 30;
    assert.equal((await scan.onRequest({ request: request(), env })).status, 429);
    assert.equal(aiCalls, 2, 'Exhaustion must not call AI');
    plan = 'free';
    const integrationRequest = method => new Request('https://app.invalid/api/binance', { method, headers: { Authorization: 'Bearer test' } });
    assert.equal((await binance.onRequest({ request: integrationRequest('GET'), env })).status, 403);
    assert.equal(storageCalls, 0);
    assert.equal((await binance.onRequest({ request: integrationRequest('DELETE'), env })).status, 200);
    assert.ok(storageCalls > 0, 'Downgraded users may disconnect their credentials');
  } finally { global.fetch = original; }
  console.log('PASS: API plans fail closed, forged plan ignored, blocked/Free denied, valid scans reserved, exhausted quota prevents AI, downgrade disconnect allowed. Mocked HTTP/provider tests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
