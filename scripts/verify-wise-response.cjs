const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
const start = source.indexOf('  async function readWiseRateResponse(');
const end = source.indexOf("  document.addEventListener('click'", start);
assert.ok(start >= 0 && end > start);
const context = vm.createContext({});
vm.runInContext(source.slice(start, end), context);
(async () => {
  await assert.rejects(context.readWiseRateResponse(new Response('Not found', { status: 404 })), /Consulta Wise indisponivel/);
  await assert.rejects(context.readWiseRateResponse(new Response('<html>', { headers: { 'Content-Type': 'application/json' } })), /Resposta Wise invalida/);
  await assert.rejects(context.readWiseRateResponse(new Response(JSON.stringify({ error: 'Token ausente.' }), { status: 503, headers: { 'Content-Type': 'application/json' } })), /Token ausente/);
  const data = await context.readWiseRateResponse(new Response('{"rate":5}', { headers: { 'Content-Type': 'application/json' } }));
  assert.equal(data.rate, 5);
  console.log('PASS: Wise response handles static 404, malformed JSON, missing configuration and valid JSON without exposing parser errors.');
})().catch(error => { console.error(error); process.exitCode = 1; });
