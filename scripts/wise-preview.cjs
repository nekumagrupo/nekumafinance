const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
module.exports = function wisePreview() {
  const source = fs.readFileSync(path.join(__dirname, '../outputs/finance-pwa/app.js'), 'utf8');
  const context = vm.createContext({
    formatMoney: value => 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    convert: () => 1336.55, latestRate: () => ({}),
    fxConverterCurrencyOptions: selected => ['USD', 'BRL', 'JPY', 'EUR'].map(currency => `<option ${currency === selected ? 'selected' : ''}>${currency}</option>`).join('')
  });
  for (const name of ['renderWiseConverterAction', 'renderWorkspaceFxConverter']) {
    const start = source.indexOf('  function ' + name + '(');
    const end = source.indexOf('\n  }', start) + 4;
    if (start < 0 || end <= start) throw new Error('Missing converter renderer');
    vm.runInContext(source.slice(start, end), context);
  }
  const card = vm.runInContext('renderWorkspaceFxConverter()', context);
  return `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css?v=281"><title>Conversor Wise - previa visual</title><style>
    body{margin:0;padding:24px;background:#eef2f0;font-family:Arial,sans-serif}.preview-grid{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}.preview-surface{width:265px;padding:16px;background:#103f32;border-radius:8px;color:white}.preview-surface.purple{background:#392357}.preview-surface .workspace-metric{width:100%;box-sizing:border-box;padding:14px;background:rgba(255,255,255,.08);border:1px solid #ffffff40;border-radius:8px;color:white}.preview-surface input,.preview-surface select{background:#ffffff15;color:white;border:1px solid #ffffff45}.preview-surface strong{color:white}.preview-surface option{color:#142d22;background:white}.preview-surface [data-wise-status]{color:#e2ece7}@media(max-width:500px){body{padding:16px}.preview-surface{width:100%;box-sizing:border-box}}
  </style></head><body><div class="preview-grid"><section class="preview-surface">${card}</section><section class="preview-surface purple">${card}</section></div><script src="/assets/vendor/lucide.min.js"></script><script>lucide.createIcons();</script></body></html>`;
};
