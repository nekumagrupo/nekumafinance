const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const helper = await import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync('functions/_shared/paypal-billing.js','utf8')).toString('base64'));
  const from = new Date(Date.now() - 3600000).toISOString();
  const until = new Date(Date.now() + 29 * 86400000).toISOString();
  const subscription = { status:'ACTIVE', billing_info:{ last_payment:{time:from,amount:{currency_code:'JPY',value:'480'}}, next_billing_time:until } };
  const transaction = { id:'SALE-1',status:'COMPLETED',time:from,amount_with_breakdown:{gross_amount:{currency_code:'JPY',value:'480'}} };
  assert.equal(helper.confirmedSandboxPeriod(subscription,transaction,'pro').until,until);
  assert.equal(helper.confirmedSandboxPeriod(subscription,{...transaction,status:'PENDING'},'pro'),null);
  assert.equal(helper.confirmedSandboxPeriod(subscription,{...transaction,time:undefined},'pro'),null);
  assert.equal(helper.confirmedSandboxPeriod(subscription,transaction,'family'),null);
  assert.equal(helper.confirmedSandboxPeriod({billing_info:{}},transaction,'pro'),null);
  assert.equal(helper.confirmedSandboxPeriod({...subscription,billing_info:{...subscription.billing_info,next_billing_time:new Date(Date.now()+90*86400000).toISOString()}},transaction,'pro'),null);
  const originalFetch = global.fetch;
  const operations = [];
  global.fetch = async (url,options) => {
    assert.equal(options.redirect,'manual');
    const name = new URL(url).pathname.split('/').pop();
    operations.push({name,args:JSON.parse(options.body)});
    return new Response(JSON.stringify(name==='paypal_sandbox_entitlement'?{active:true,paidUntil:until,reason:'paid'}:true));
  };
  const env = {PAYPAL_SANDBOX_LEDGER_ENABLED:'true',SUPABASE_URL:'https://db.invalid',SUPABASE_SERVICE_ROLE_KEY:'secret'};
  const binding = {id:'checkout',subscription_id:'I-TEST',plan:'pro',merchant_profile:'jp'};
  try {
    assert.equal(await helper.sandboxEntitlement({},binding,subscription,()=>assert.fail('Disabled ledger must not reconcile')),null);
    const simulation = await helper.sandboxEntitlement(env,binding,subscription,async()=>({transactions:[transaction]}));
    assert.equal(simulation.plan,'pro'); assert.equal(simulation.renewalExpected,true);
    assert.equal(operations[0].name,'paypal_sandbox_confirm_period');
    const cancelled = await helper.sandboxEntitlement(env,binding,{...subscription,status:'CANCELLED'},async()=>({transactions:[transaction]}));
    assert.equal(cancelled.active,true); assert.equal(cancelled.renewalExpected,false);
    const paused = await helper.sandboxEntitlement(env,binding,{...subscription,status:'SUSPENDED'},async()=>({transactions:[transaction]}));
    assert.equal(paused.active,false);
    await helper.sandboxEntitlement(env,binding,subscription,async()=>({transactions:[{...transaction,status:'REFUNDED'}]}));
    assert.ok(operations.some(op=>op.name==='paypal_sandbox_hold_payment'&&op.args.target_payment==='SALE-1'));
  } finally { global.fetch = originalFetch; }

  const {PGlite} = require('../tmp/commercial-qa/node_modules/@electric-sql/pglite');
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create function auth.role() returns text language sql as $$ select current_setting('request.jwt.claim.role',true) $$;");
  for (const name of ['supabase-paypal-sandbox-v6.sql','supabase-paypal-status-v7.sql','supabase-paypal-profiles-v8.sql','supabase-paypal-ledger-v9.sql']) {
    const sql = fs.readFileSync('outputs/finance-pwa/'+name,'utf8'); await db.exec(sql);
    if (name.includes('ledger')) await db.exec(sql);
  }
  const user='11111111-1111-4111-8111-111111111111';
  await db.exec(`insert into auth.users values('${user}'); set request.jwt.claim.role='service_role';`);
  const checkout=(await db.query('select public.paypal_sandbox_reserve_profile($1,$2,$3) result',[user,'pro','jp'])).rows[0].result;
  await db.query('select public.paypal_sandbox_bind($1,$2)',[checkout.id,'I-TEST']);
  const read = async()=> (await db.query('select public.paypal_sandbox_entitlement($1,$2) result',[checkout.id,'jp'])).rows[0].result;
  assert.equal((await read()).active,false,'Approval alone never grants access');
  const confirm=()=>db.query('select public.paypal_sandbox_confirm_period($1,$2,$3,$4,$5)',[checkout.id,'jp','SALE-1',from,until]);
  await confirm(); await confirm();
  assert.equal((await read()).active,true);
  assert.equal((await db.query('select count(*)::int n from public.paypal_sandbox_periods')).rows[0].n,1);
  await assert.rejects(db.query('select public.paypal_sandbox_confirm_period($1,$2,$3,$4,$5)',[checkout.id,'legacy','SALE-1',from,until]),/INVALID/);
  await assert.rejects(db.query('select public.paypal_sandbox_confirm_period($1,$2,$3,$4,$5)',[checkout.id,'jp','SALE-1',from,new Date(Date.parse(until)+1000).toISOString()]),/CONFLICT/);
  await db.query('select public.paypal_sandbox_hold_payment($1,$2,$3,$4)',['jp','SALE-1','REFUND','PAYMENT.SALE.REFUNDED']);
  await confirm(); assert.equal((await read()).active,false,'Late completed event cannot undo a refund');
  assert.equal((await read()).reason,'payment_review');
  // A refund may precede its payment event.
  await db.query('select public.paypal_sandbox_hold_payment($1,$2,$3,$4)',['jp','SALE-2','REVERSED','PAYMENT.SALE.REVERSED']);
  await db.query('select public.paypal_sandbox_confirm_period($1,$2,$3,$4,$5)',[checkout.id,'jp','SALE-2',from,until]);
  assert.equal((await read()).active,false);
  const pastFrom=new Date(Date.now()-60*86400000).toISOString(),pastUntil=new Date(Date.now()-30*86400000).toISOString();
  await db.query('select public.paypal_sandbox_confirm_period($1,$2,$3,$4,$5)',[checkout.id,'jp','OLD',pastFrom,pastUntil]);
  assert.equal((await read()).active,false,'Old payments cannot renew access');
  await db.query('select public.paypal_sandbox_confirm_period($1,$2,$3,$4,$5)',[checkout.id,'jp','RENEWAL',from,until]);
  assert.equal((await read()).active,true,'A different confirmed payment can cover a new period');
  await db.exec("set request.jwt.claim.role='authenticated';");
  await assert.rejects(read(),/FORBIDDEN/);
  await assert.rejects(confirm(),/FORBIDDEN/);
  assert.equal((await db.query("select has_table_privilege('authenticated','public.paypal_sandbox_periods','SELECT') allowed")).rows[0].allowed,false);
  await db.close();
  console.log('PASS: Sandbox paid-period proof, cancellation policy, suspension, reconciliation, duplicates, refund-before-payment, renewal and expiry; browser access denied. Mocked HTTP and disposable SQL, not live billing.');
})().catch(error=>{console.error(error);process.exitCode=1;});
