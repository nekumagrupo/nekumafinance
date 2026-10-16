const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('outputs/finance-pwa/i18n.js', 'utf8');

function load(hostname, search = '') {
  const values = new Map();
  const context = {
    window: { location: { hostname, search, href: `https://${hostname}/${search}` } },
    document: { documentElement: {} }, navigator: { language: 'pt-BR' },
    localStorage: { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) },
    URL, URLSearchParams
  };
  vm.runInNewContext(source, context);
  return context.window.NekumaI18n;
}

for (const host of ['nekumafinance.app', 'app.nekumafinance.app', 'nekuma-finance.pages.dev']) {
  const i18n = load(host, '?lang=ja-JP');
  assert.equal(i18n.publicLanguage(), 'ja-JP');
  assert.equal(i18n.publicUrl('./app.html?auth=signup'), 'https://app.nekumafinance.app/app?auth=signup&lang=ja-JP');
  assert.equal(i18n.publicUrl('./index.html?home=1'), 'https://nekumafinance.app/?lang=ja-JP');
  assert.equal(i18n.publicUrl('./privacy.html'), 'https://nekumafinance.app/privacy.html?lang=ja-JP');
  assert.equal(i18n.publicUrl('mailto:suporte@nekumafinance.app'), 'mailto:suporte@nekumafinance.app');
  assert.equal(i18n.publicUrl('https://example.com/app'), 'https://example.com/app');
}
assert.equal(load('localhost').publicUrl('./app.html?auth=signup'), './app.html?auth=signup');
assert.equal(load('127.0.0.1').publicUrl('./index.html?home=1'), './index.html?home=1');

const landing = fs.readFileSync('outputs/finance-pwa/index.html', 'utf8');
const inline = landing.match(/<script>([\s\S]*?)<\/script>/)[1];
let destination;
vm.runInNewContext(inline, {
  window: { location: { hostname: 'app.nekumafinance.app', search: '?auth=reset&code=example', hash: '#example', replace: url => { destination = url; } }, matchMedia: () => ({ matches: false }) },
  navigator: {}, URLSearchParams
});
assert.equal(destination, './app.html?auth=reset&code=example#example');
console.log('PASS: official hosts, language handoff, local preview, external links and recovery parameters.');
