const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
const start = source.indexOf('  function renderPaypalSandboxStatus()');
const end = source.indexOf('  async function loadCommercialAccess()', start);
assert.ok(start > 0 && end > start);
const renderer = source.slice(start, end);
function render(snapshot, userId = 'owner') {
  const context = { paypalSandboxStatus: snapshot, paypalSandboxLoading: false, remoteSession: { user: { id: userId } }, number: Number, Date, escapeHtml: text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]) };
  vm.runInNewContext(renderer, context);
  return context.renderPaypalSandboxStatus();
}
assert.ok(!render({ userId: 'other', available: true, status: 'not_started' }).includes('Testar PRO'));
assert.ok(!render({ userId: 'owner', available: false, status: 'not_configured' }).includes('Testar PRO'));
assert.ok(render({ userId: 'owner', available: true, status: 'not_started' }).includes('Testar PRO'));
assert.ok(render({ userId: 'owner', available: true, status: 'APPROVAL_PENDING', plan: 'pro' }).includes('Retomar teste PayPal'));
assert.ok(!render({ userId: 'other', available: true, status: 'APPROVAL_PENDING', plan: 'pro' }).includes('Retomar teste PayPal'));
assert.ok(!render({ userId: 'owner', available: true, status: 'ACTIVE', plan: 'pro' }).includes('Retomar teste PayPal'));
assert.ok(!render({ userId: 'owner', available: true, status: 'APPROVAL_PENDING', plan: '<script>' }).includes('Retomar teste PayPal'));
assert.ok(render({ userId: 'owner', available: true, status: 'APPROVED', confirmedReceipts: 0 }).includes('aguardando pagamento'));
assert.ok(!render({ userId: 'owner', available: true, status: 'ACTIVE', confirmedReceipts: 0 }).includes('plano atualizado'));
assert.ok(render({ userId: 'owner', available: true, status: 'ACTIVE', simulation: { active:true,plan:'pro',paidUntil:'2026-11-21T10:00:00Z' } }).includes('<strong>PRO</strong>'));
assert.ok(!render({ userId: 'other', available: true, status: 'ACTIVE', simulation: { active:true,plan:'pro' } }).includes('Plano simulado'));
assert.ok(render({ userId: 'owner', available: true, status: 'ACTIVE', simulation: { active:false,plan:'pro',reason:'payment_review' } }).includes('<strong>Gratis</strong>'));
assert.ok(render({ userId: 'owner', error: '<img src=x onerror=alert(1)>' }).includes('&lt;img'));
assert.ok(!source.includes('remoteSession.user?.email === "nekumagrupo@gmail.com"'));
console.log('PASS: payment UI uses user-bound server status, hides unconfigured checkouts, escapes messages and never treats approval/ACTIVE as a paid upgrade.');
if (process.argv.includes('--preview')) {
  const cases = [{ available: true, status: 'not_started' }, { available: true, status: 'APPROVED', confirmedReceipts: 0 }, { available: true, status: 'ACTIVE', confirmedReceipts: 1, lastConfirmedAt: '2026-10-18T03:00:00Z' }];
  const html = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="http://127.0.0.1:4181/styles.css"><title>QA Sandbox - dados simulados</title><body><main style="max-width:900px;margin:24px auto;padding:16px"><h1>QA Sandbox</h1><p>Dados simulados para verificar o layout. Nao representa pagamentos realizados.</p><div style="display:grid;gap:20px">' + cases.map(item => render({ ...item, userId: 'owner' })).join('') + '</div></main></body></html>';
  fs.mkdirSync('work', { recursive: true }); fs.writeFileSync('work/paypal-status-qa.html', html);
}
