const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
const start = source.indexOf('  function renderFxChangeChip(');
assert.ok(start >= 0);
const code = source.slice(start, source.indexOf('\n  function ', start + 1));
const context = vm.createContext({ formatPercent: value => `${value}%` });
vm.runInContext(code, context);
for (const [value, expected] of [[1.5, '+1.5%'], [-1.5, '-1.5%'], [0, '+0%']]) {
  context.value = value;
  assert.ok(vm.runInContext('renderFxChangeChip(value)', context).includes(expected));
}
for (const value of [null, undefined, '', ' ', NaN, Infinity]) {
  context.value = value;
  assert.match(vm.runInContext('renderFxChangeChip(value)', context), /neutral">--/);
}
assert.equal((source.match(/class="workspace-metric workspace-quote"/g) || []).length, 3);
console.log('PASS: signed FX variations, absent values stay neutral, all three workspace quotes use readable layout. VM/static checks.');
