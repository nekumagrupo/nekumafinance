const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('../tmp/commercial-qa/node_modules/@electric-sql/pglite');
(async()=>{
 const helper=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('functions/_shared/paypal-billing.js','utf8')).toString('base64'));
 const flags={PAYPAL_SANDBOX_LEDGER_ENABLED:'true',PAYPAL_SANDBOX_ACCESS_ENABLED:'true'};
 const ended={status:'CANCELLED'};
 const unpaid={active:false,reason:'no_current_paid_period'};
 assert.equal(helper.canRestartSandboxCheckout(flags,ended,unpaid),true);
 for(const status of ['ACTIVE','SUSPENDED','APPROVAL_PENDING']) assert.equal(helper.canRestartSandboxCheckout(flags,{status},unpaid),false);
 assert.equal(helper.canRestartSandboxCheckout(flags,ended,{active:true}),false);
 assert.equal(helper.canRestartSandboxCheckout({},ended,unpaid),false);
 assert.equal(helper.canRestartSandboxCheckout(flags,{...ended,billing_info:{last_payment:{time:new Date().toISOString()}}},unpaid),false);
 assert.equal(helper.canRestartSandboxCheckout(flags,{...ended,billing_info:{last_payment:{time:'invalid'}}},unpaid),false);
 assert.equal(helper.canRestartSandboxCheckout(flags,ended,{active:false,reason:'payment_review'}),true);
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);
   create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
   create table public.commercial_access_overrides(user_id uuid primary key,plan text,valid_until timestamptz);
   create table public.commercial_subscriptions(user_id uuid primary key,plan text,status text,trial_ends_at timestamptz,paid_until timestamptz);`);
  for(const name of ['sandbox-v6','status-v7','profiles-v8','ledger-v9','access-v10','restart-v12']) {
   const sql=fs.readFileSync(`outputs/finance-pwa/supabase-paypal-${name}.sql`,'utf8');await db.exec(sql);if(name==='restart-v12')await db.exec(sql);
  }
  const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
  await db.exec(`insert into auth.users values('${user}'),('${other}');set request.jwt.claim.role='service_role';insert into public.paypal_sandbox_access_testers values('${user}','jp',true);`);
  const call=async(name,args)=>(await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result;
  const first=await call('paypal_sandbox_reserve_profile',[user,'pro','jp']);
  await call('paypal_sandbox_bind',[first.id,'I-OLD']);
  const sync=status=>call('paypal_sandbox_sync_state',[first.id,'jp',status,new Date().toISOString()]);
  await sync('ACTIVE');
  await assert.rejects(call('paypal_sandbox_restart',[user,first.id,'jp']),/SUBSCRIPTION_NOT_ENDED/);
  const from=new Date(Date.now()-3600000).toISOString(),until=new Date(Date.now()+28*86400000).toISOString();
  await call('paypal_sandbox_confirm_period',[first.id,'jp','SALE-OLD',from,until]);
  await sync('CANCELLED');
  await assert.rejects(call('paypal_sandbox_restart',[user,first.id,'jp']),/PAID_PERIOD_REMAINS/);
  await call('paypal_sandbox_hold_payment',['jp','SALE-OLD','EV-REFUND','PAYMENT.SALE.REFUNDED']);
  await assert.rejects(call('paypal_sandbox_restart',[other,first.id,'jp']),/INVALID_CHECKOUT/);
  await assert.rejects(call('paypal_sandbox_restart',[user,first.id,'legacy']),/INVALID_CHECKOUT/);
  const next=await call('paypal_sandbox_restart',[user,first.id,'jp']);
  assert.notEqual(next.id,first.id);assert.equal(next.plan,'pro');assert.equal(next.subscription_id,null);
  assert.equal((await call('paypal_sandbox_restart',[user,first.id,'jp'])).id,next.id);
  assert.equal((await call('paypal_sandbox_customer_status_profile',[user,'jp'])).id,next.id);
  assert.equal((await call('paypal_sandbox_lookup',['I-OLD'])).id,first.id);
  assert.equal((await db.query('select count(*)::int n from public.paypal_sandbox_checkouts')).rows[0].n,2);
  assert.equal(await call('commercial_effective_plan',[user]),'free');
  // A delayed payment on an archived subscription cannot reactivate access.
  await call('paypal_sandbox_confirm_period',[first.id,'jp','LATE-OLD',from,until]);
  assert.equal(await call('commercial_effective_plan',[user]),'free');
  await call('paypal_sandbox_bind',[next.id,'I-NEW']);
  await call('paypal_sandbox_sync_state',[next.id,'jp','ACTIVE',new Date().toISOString()]);
  await call('paypal_sandbox_confirm_period',[next.id,'jp','SALE-NEW',from,until]);
  assert.equal(await call('commercial_effective_plan',[user]),'pro');
  await db.exec(`insert into public.commercial_access_overrides values('${user}','family',null);`);
  assert.equal(await call('commercial_effective_plan',[user]),'family');
  await db.exec("set request.jwt.claim.role='authenticated'");
  await assert.rejects(call('paypal_sandbox_restart',[user,next.id,'jp']),/FORBIDDEN/);
  console.log('PASS: ended/unpaid restart only, retry reuse, paid-period blocking, account/profile isolation, retained history, late archived payments, new PRO activation and manual override priority. Disposable PostgreSQL, not live PayPal.');
 } finally {await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
