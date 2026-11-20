const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
const start = app.indexOf('  function renderEmergencyReservePanel(');
const end = app.indexOf('\n  }', start);
assert.ok(start >= 0 && end > start);
let goal = null;
let calculations = 0;
const context = vm.createContext({
  emergencyGoal: () => goal,
  primaryCurrency: () => 'JPY',
  emergencyReserveStats: () => {
    calculations++;
    return { target: 600000, saved: 150000, months: 6, contributionPercent: 5 };
  },
  clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
  formatMoneyWithPrimary: value => `JPY ${value}`,
  formatPercent: value => `${value}%`
});
vm.runInContext(app.slice(start, end + 4), context);
let html = context.renderEmergencyReservePanel({});
assert.match(html, /Nenhuma reserva cadastrada/);
assert.match(html, /data-modal="emergencyReserve">Criar reserva/);
assert.doesNotMatch(html, /Meta estipulada|meses de seguranca|progressbar|JPY/);
assert.equal(calculations, 0);

goal = { id: 'existing-reserve' };
html = context.renderEmergencyReservePanel({});
assert.match(html, /JPY 600000/);
assert.match(html, /aria-valuenow="25"/);
assert.match(html, /data-id="existing-reserve">Editar/);
assert.match(html, /data-modal="goalContribution"/);
assert.doesNotMatch(html, /Nenhuma reserva cadastrada/);
assert.equal(calculations, 1);
assert.deepEqual(goal, { id: 'existing-reserve' });
console.log('PASS: empty reserve shows only creation action; existing reserve keeps target, progress and actions without mutation.');
