const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
const start = source.indexOf('  async function refreshPlansAccess()');
const end = source.indexOf('  function requestRemotePull(', start);
assert.ok(start > 0 && end > start);
const refresh = source.slice(start, end);
assert.ok(!refresh.includes('loadPaypalSandboxStatus'));
(async () => {
  let reads = 0, renders = 0, release;
  const context = {
    planAccessRefreshInFlight: false, document: { hidden: false }, resetInProgress: false,
    remoteStore: { enabled: true }, remoteSession: { status: 'ready', user: { id: 'a' }, commercialAccess: { plan: 'free', checkedAt: 1 } },
    state: { ui: { activeTab: 'plans' } }, stateGeneration: 1,
    renderKeepingScroll: () => renders++,
    loadCommercialAccess: async () => { reads++; context.remoteSession.commercialAccess = { plan: 'pro', checkedAt: reads + 1 }; }
  };
  vm.runInNewContext(refresh, context);
  await context.refreshPlansAccess(); assert.equal(renders, 1);
  await context.refreshPlansAccess(); assert.equal(renders, 1, 'Timestamp alone must not redraw');
  context.document.hidden = true; await context.refreshPlansAccess(); assert.equal(reads, 2);
  context.document.hidden = false; context.state.ui.activeTab = 'settings';
  await context.refreshPlansAccess(); assert.equal(reads, 2);
  context.state.ui.activeTab = 'plans';
  context.loadCommercialAccess = () => new Promise(resolve => { reads++; release = resolve; });
  const pending = context.refreshPlansAccess(); await context.refreshPlansAccess(); assert.equal(reads, 3);
  context.remoteSession.user.id = 'b'; release(); await pending; assert.equal(renders, 1, 'Old session must not render');
  context.loadCommercialAccess = async () => { throw new Error('offline'); };
  await context.refreshPlansAccess(); assert.equal(context.planAccessRefreshInFlight, false);
  console.log('PASS: database-only plan refresh, hidden/settings guards, no overlap, session isolation and no timestamp redraw. Mocked tests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
