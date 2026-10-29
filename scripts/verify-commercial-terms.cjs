const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const terms = fs.readFileSync(path.join(__dirname, '../outputs/finance-pwa/terms.html'), 'utf8');
for (const text of ['29 de outubro de 2026', '72 horas', 'não gera cobrança automática',
  '¥480 JPY por mês', 'não equivale a reembolso', 'confirmação válida do pagamento no servidor',
  'Registros existentes são preservados', 'artigo 49', '7 dias',
  'contratação comercial do PRO ainda não está habilitada', 'não será aplicada retroativamente']) {
  assert.ok(terms.includes(text), `Missing commercial disclosure: ${text}`);
}
assert.ok(!terms.includes('sem direito a reembolso'));
console.log('PASS: trial, planned price, test-only availability, renewal/cancellation distinction, payment confirmation, downgrade preservation and statutory-rights disclosures. Static content checks, not legal certification.');
