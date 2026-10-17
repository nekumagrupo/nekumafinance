const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const source = fs.readFileSync('functions/_middleware.js', 'utf8');
  const { onRequest } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const check = (url, method = 'GET') => onRequest({ request: new Request(url, { method }), next: () => new Response('next') });
  const cases = [
    ['https://nekuma-finance.pages.dev/', 'https://nekumafinance.app/'],
    ['https://nekuma-finance.pages.dev/app.html?auth=reset&code=test', 'https://app.nekumafinance.app/app?auth=reset&code=test'],
    ['https://preview.nekuma-finance.pages.dev/?code=test', 'https://app.nekumafinance.app/app?code=test'],
    ['https://nekumafinance.app/app?auth=signup&lang=ja-JP', 'https://app.nekumafinance.app/app?auth=signup&lang=ja-JP'],
    ['https://app.nekumafinance.app/?auth=login', 'https://app.nekumafinance.app/app?auth=login'],
    ['https://nekuma-finance.pages.dev/privacy.html', 'https://nekumafinance.app/privacy.html']
  ];
  for (const [url, location] of cases) {
    const response = await check(url);
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('Location'), location);
  }
  for (const url of ['https://app.nekumafinance.app/admin','https://app.nekumafinance.app/admin.html?auth=login','https://nekuma-finance.pages.dev/admin']) {
    const response=await check(url);
    assert.equal(response.status,302);
    assert.equal(response.headers.get('Location'),'https://nekumafinance.app/admin');
  }
  assert.equal((await check('https://admin.nekumafinance.app/')).headers.get('Location'),'https://admin.nekumafinance.app/admin');
  assert.equal((await check('https://admin.nekumafinance.app/app')).status,404);
  assert.equal((await check('https://admin.nekumafinance.app/api/support')).status,404);
  for (const url of ['https://admin.nekumafinance.app/admin','https://admin.nekumafinance.app/admin.js','https://nekumafinance.app/admin?auth=login','http://localhost/admin.html']) assert.equal(await (await check(url)).text(),'next');
  assert.equal((await check('https://nekuma-finance.pages.dev/api/receipt-scan', 'POST')).status, 410);
  assert.equal((await check('https://nekuma-finance.pages.dev/api/binance')).status, 410);
  for (const url of ['https://app.nekumafinance.app/app', 'https://app.nekumafinance.app/api/receipt-scan', 'https://nekumafinance.app/', 'http://localhost/app.html']) {
    assert.equal(await (await check(url)).text(), 'next');
  }
  console.log('PASS: official domains, legacy redirects, auth parameters, API rejection and local development.');
})().catch(error => { console.error(error); process.exitCode = 1; });
