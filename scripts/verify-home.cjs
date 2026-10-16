const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('outputs/finance-pwa/index.html', 'utf8');
const source = fs.readFileSync('outputs/finance-pwa/home.js', 'utf8');
const keys = [...html.matchAll(/data-copy="([^"]+)"/g)].map(match => match[1]);
const panels = Object.fromEntries(['overview', 'salary', 'family'].map(id => [`demo-${id}`, { hidden:id !== 'overview' }]));
const tabs = ['overview', 'salary', 'family'].map(id => ({
  dataset:{ demo:id }, listeners:{}, attrs:{},
  addEventListener(name, fn) { this.listeners[name] = fn; },
  setAttribute(key, value) { this.attrs[key] = value; }, focus() { this.focused = true; }
}));
const context = {
  window:{ location:{ href:'http://localhost/' } },
  document:{ documentElement:{}, querySelector:() => null, querySelectorAll:selector => selector === '[data-demo]' ? tabs : [], getElementById:id => panels[id], addEventListener() {} }, URL
};
vm.runInNewContext(source.replace('  const originals =', '  window.homeTranslations = translations;\n  const originals ='), context);
for (const locale of ['en-US', 'ja-JP']) {
  for (const key of keys) assert.ok(context.window.homeTranslations[locale][key], `${locale}: missing ${key}`);
}
tabs[1].listeners.click();
assert.equal(panels['demo-salary'].hidden, false);
assert.equal(panels['demo-overview'].hidden, true);
tabs[1].listeners.keydown({ key:'ArrowRight', preventDefault() {} });
assert.equal(panels['demo-family'].hidden, false);
assert.equal(tabs[2].attrs['aria-selected'], 'true');
assert.equal(tabs[2].focused, true);
for (const [, asset] of html.matchAll(/(?:src|href)="\.\/([^"?]+)(?:\?[^" ]*)?"/g)) {
  assert.ok(fs.existsSync(`outputs/finance-pwa/${asset}`), `Missing asset: ${asset}`);
}
assert.match(html, /¥480/);
assert.match(html, /3 dias de teste/);
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.ok(fs.statSync('outputs/finance-pwa/assets/home-family-japan.webp').size < 200000);
console.log(`PASS: ${keys.length} translated labels in EN/JA, demo click/keyboard, assets, pricing and compressed hero.`);
