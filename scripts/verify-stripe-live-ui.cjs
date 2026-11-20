const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const requestSource = extract('  async function stripeLiveRequest(checkout)', '  async function stripeLiveCancel()');
const panelSource = extract('  function renderStripeLivePanel()', '  async function stripeTestRequest(');
(async () => {
  let confirmation = '', sent = null, destination = null, notice = '';
  const context = vm.createContext({
    remoteSession: { user: { id: 'owner' } }, stripeLiveBusy: false,
    stripeLiveSnapshot: { userId: 'owner', available: true, amount: 100, validation: true },
    render() {}, showToast(text) { notice = text; }, escapeHtml: String,
    currentSupabaseAccessToken: async () => 'fixture', loadCommercialAccess: async () => {},
    URL, Date,
    window: { confirm(text) { confirmation = text; return true; }, location: { assign(url) { destination = url; } } },
    fetch: async (url, options) => {
      sent = JSON.parse(options.body);
      return new Response(JSON.stringify({ environment: 'live', approvalUrl: 'https://checkout.stripe.com/c/pay/fixture' }),
        { headers: { 'Content-Type': 'application/json' } });
    }
  });
  vm.runInContext(requestSource + panelSource, context);
  assert.match(context.renderStripeLivePanel(), /JPY 100\/mes/);
  assert.match(context.renderStripeLivePanel(), /pagamento real/);
  await context.stripeLiveRequest(true);
  assert.match(confirmation, /JPY 100 por mes/);
  assert.match(confirmation, /renovacao automatica/);
  assert.equal(sent.quotedAmount, 100);
  assert.equal(destination, 'https://checkout.stripe.com/c/pay/fixture');
  context.stripeLiveSnapshot = { userId: 'owner', available: true, amount: 480, validation: false };
  assert.match(context.renderStripeLivePanel(), /JPY 480\/mes/);
  await context.stripeLiveRequest(true); assert.equal(sent.quotedAmount, 480);
  sent = null;
  context.stripeLiveSnapshot = { userId: 'another', available: true, amount: 100, validation: true };
  await context.stripeLiveRequest(true); assert.equal(sent, null); assert.match(notice, /confirmar o preco/);
  context.stripeLiveSnapshot = { userId: 'owner', available: true, amount: 1 };
  await context.stripeLiveRequest(true); assert.equal(sent, null);
  console.log('PASS: LIVE price displayed and confirmed before checkout, exact quoted amount, cross-user and unknown-price guards. Isolated frontend functions.');
})().catch(error => { console.error(error); process.exitCode = 1; });
