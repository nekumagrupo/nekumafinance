const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
const start = source.indexOf('  let remoteSignOutInProgress = false;');
const end = source.indexOf('  function socialAuthRedirectUrl()', start);
assert.ok(start > 0 && end > start);

async function check({ pending = false, flushFails = false, logoutError = false, storageFails = false } = {}) {
  const calls = [];
  const context = {
    remoteStore: { enabled: true, client: { auth: { async signOut(options) {
      assert.equal(options.scope, 'local'); calls.push('logout');
      return { error: logoutError ? new Error('Logout unavailable') : null };
    } } } },
    remoteSession: { status: 'ready', user: { id: 'owner' }, householdId: 'household', commercialAccess: { plan: 'family' } },
    state: { owner: 'owner' }, activeStorageKey: 'cache:owner:household',
    stateGeneration: 1, remoteSaveTimer: 42, lastLocalChangeAt: 100,
    paypalSandboxStatus: { userId: 'owner' }, authView: 'ready',
    hasPendingLocalChanges: () => pending,
    persistLocalState() { if (storageFails) throw new Error('Storage unavailable'); calls.push('persist'); },
    async flushRemoteState() { calls.push('flush'); if (flushFails) throw new Error('PLAN_LIMIT'); },
    stopRemoteAutoSync: () => calls.push('stop'), startRemoteAutoSync: () => calls.push('restart'),
    clearTimeout: () => calls.push('clearTimer'),
    localStorage: { removeItem(key) { assert.equal(key, 'cache:owner:household'); calls.push('remove'); } },
    createInitialState: () => ({ empty: true }), render: () => calls.push('render'),
    showToast: message => calls.push(message)
  };
  vm.runInNewContext(source.slice(start, end), context);
  await Promise.all([context.signOutRemote(), context.signOutRemote()]);
  assert.ok(calls.filter(x => x === 'logout').length <= 1, 'Repeated click is ignored');
  if (logoutError || storageFails) {
    assert.equal(context.remoteSession.user.id, 'owner');
    assert.equal(context.activeStorageKey, 'cache:owner:household');
    assert.ok(!calls.includes('remove'));
    assert.ok(context.remoteSession.error);
  } else {
    assert.equal(context.remoteSession.status, 'signedOut');
    assert.equal(context.remoteSession.user, null);
    assert.equal(context.remoteSession.commercialAccess, null);
    assert.equal(context.paypalSandboxStatus, null);
    assert.equal(context.activeStorageKey, '');
    assert.equal(context.stateGeneration, 2);
    assert.equal(calls.includes('remove'), !flushFails);
    if (pending) assert.ok(calls.indexOf('persist') < calls.indexOf('flush'));
  }
}
(async () => {
  await check();
  await check({ pending: true });
  await check({ pending: true, flushFails: true });
  await check({ pending: true, flushFails: true, logoutError: true });
  await check({ pending: true, storageFails: true });
  console.log('PASS: sync rejection does not block logout; pending cache stays account-scoped, duplicate clicks are ignored and failed logout/storage never pretends success. Mocked session tests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
