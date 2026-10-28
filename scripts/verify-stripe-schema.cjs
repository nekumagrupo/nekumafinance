const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('../tmp/commercial-qa/node_modules/@electric-sql/pglite');
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.role() returns text language sql as $$ select current_setting('request.jwt.claim.role', true) $$;
      insert into auth.users values('569ccf01-6360-479e-8117-28dcdfba2335');`);
    const source = fs.readFileSync('outputs/finance-pwa/supabase-stripe-test-v14.sql', 'utf8');
    await db.exec(source); await db.exec(source);
    await assert.rejects(db.query("select public.stripe_test_reserve('569ccf01-6360-479e-8117-28dcdfba2335')"), /FORBIDDEN/);
    await db.exec("set request.jwt.claim.role = 'service_role'");
    const reserve = async () => (await db.query("select public.stripe_test_reserve('569ccf01-6360-479e-8117-28dcdfba2335') as value")).rows[0].value;
    const first = await reserve(); assert.equal((await reserve()).id, first.id);
    await db.query('select public.stripe_test_bind($1,$2)', [first.id, 'cs_test_fixture']);
    assert.equal((await reserve()).session_id, 'cs_test_fixture');
    await assert.rejects(db.query('select public.stripe_test_bind($1,$2)', [first.id, 'cs_live_wrong']), /INVALID_SESSION/);
    await assert.rejects(db.query('select public.stripe_test_bind($1,$2)', [first.id, 'cs_test_other']), /BINDING_CONFLICT/);
    assert.equal((await db.query("select has_table_privilege('authenticated','public.stripe_test_checkouts','SELECT') as allowed")).rows[0].allowed, false);
    assert.equal((await db.query("select has_function_privilege('anon','public.stripe_test_reserve(uuid)','EXECUTE') as allowed")).rows[0].allowed, false);
    console.log('PASS: Stripe private schema, rerunnable migration, reservation reuse, test-only binding, conflict checks and denied guest permissions. Disposable PostgreSQL.');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
