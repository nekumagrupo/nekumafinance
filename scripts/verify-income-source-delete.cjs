const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
const start = app.indexOf('  function deleteIncomeSourceLinks(');
const end = app.indexOf('\n  }', start);
const state = {
  transactions: [
    { id: 'salary', salaryPaymentKey: '2026-10:salary:company' },
    { id: 'deduction', payrollKey: '2026-10:salary-deduction:company:tax' },
    { id: 'work', sourceId: 'company' },
    { id: 'other', salaryPaymentKey: '2026-10:salary:company-other' },
    { id: 'purchase', bankAccountId: 'same-bank' }
  ],
  paidCommitments: { '2026-10:salary:company': {}, '2026-10:salary:company-other': {}, housing: { companyId: 'company' } },
  housingCards: [{ id: 'home', items: [{ key: 'rent', amount: 100, companyId: 'company', payrollMonths: {
    '2026-11': { amount: 50, companyId: 'company' }, '2026-12': { amount: 80, companyId: 'other' }
  } }, { key: 'water', amount: 20, companyId: 'other' }] }]
};
let removed;
const context = vm.createContext({ state, rememberDeletedItems: (collection, rows, at) => { removed = { collection, rows, at }; } });
vm.runInContext(app.slice(start, end + 4), context);
context.deleteIncomeSourceLinks('company', 'now');
assert.deepEqual(state.transactions.map(row => row.id), ['other', 'purchase']);
assert.equal(removed.rows.length, 3);
assert.equal(removed.collection, 'transactions');
assert.equal(removed.at, 'now');
assert.deepEqual(Object.keys(state.paidCommitments), ['2026-10:salary:company-other']);
assert.equal(state.housingCards[0].items[0].amount, 0);
assert.deepEqual(Object.keys(state.housingCards[0].items[0].payrollMonths), ['2026-12']);
assert.equal(state.housingCards[0].items[1].amount, 20);
console.log('PASS: company salary, deductions, receipts and housing links removed; unrelated transactions and housing preserved.');
