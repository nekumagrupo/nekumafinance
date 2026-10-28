const assert=require('node:assert/strict');
const fs=require('node:fs');
const encode=v=>'data:text/javascript;base64,'+Buffer.from(v).toString('base64');
(async()=>{
 const paypal=encode(fs.readFileSync('functions/_shared/paypal-billing.js','utf8'));
 const billing=encode(fs.readFileSync('functions/_shared/stripe-billing.js','utf8').replace('./paypal-billing.js',paypal));
 const helper=await import(encode(fs.readFileSync('functions/_shared/stripe-cycles.js','utf8').replace('./paypal-billing.js',paypal).replace('./stripe-billing.js',billing)));
 const env={STRIPE_BILLING_MODE:'test',STRIPE_TEST_SECRET_KEY:'sk_test_fixture',SUPABASE_URL:'https://db.invalid',SUPABASE_SERVICE_ROLE_KEY:'server'};
 const now=Math.floor(Date.now()/1000), original=global.fetch;
 let advancing=false,clockCreates=0,customerCreates=0,bindings=0;
 const reservation={id:'cycle',user_id:'user',created_at:new Date(now*1000).toISOString()};
 const session={id:'cs_test_fixture',mode:'subscription',currency:'jpy',amount_total:480,client_reference_id:'user',metadata:{nekuma_user:'user',nekuma_plan:'pro'},status:'complete',subscription:'sub_fixture',customer:'cus_fixture'};
 global.fetch=async(url,options)=>{
  const body=new URLSearchParams(options.body);
  const json=v=>new Response(JSON.stringify(v));
  if(url.endsWith('/stripe_test_clock_bind')){bindings++;return json(true);}
  if(url.endsWith('/test_helpers/test_clocks')){
   clockCreates++;assert.equal(options.headers['Idempotency-Key'],'nekuma-clock-cycle');assert.equal(body.get('frozen_time'),String(now));
   return json({id:'clock_fixture',livemode:false,status:'ready',frozen_time:now});
  }
  if(url.endsWith('/customers')){
   customerCreates++;assert.equal(body.get('test_clock'),'clock_fixture');assert.equal(options.headers['Idempotency-Key'],'nekuma-clock-customer-cycle');
   return json({id:'cus_fixture',test_clock:'clock_fixture',livemode:false});
  }
  if(url.endsWith('/test_helpers/test_clocks/clock_fixture'))return json({id:'clock_fixture',livemode:false,status:advancing?'advancing':'ready',frozen_time:now+31*86400});
  if(url.endsWith('/subscriptions/sub_fixture'))return json({id:'sub_fixture',livemode:false,status:'active',cancel_at_period_end:true,customer:'cus_fixture',metadata:{nekuma_user:'user',nekuma_plan:'pro'}});
  throw new Error('Unexpected '+url);
 };
 try{
  const binding=await helper.prepareClock(env,reservation);assert.equal(binding.clock_id,'clock_fixture');assert.equal(clockCreates,1);assert.equal(customerCreates,1);
  await helper.prepareClock(env,binding);assert.equal(clockCreates,1);
  assert.equal(await helper.clockTime(env,binding,{test_clock:'clock_fixture'}),(now+31*86400)*1000);assert.equal(bindings,2);
  await assert.rejects(helper.clockTime(env,binding,{test_clock:'clock_other'}),/divergente/);
  await assert.rejects(helper.clockTime(env,reservation,{test_clock:'clock_fixture'}),/nao vinculado/);
  advancing=true;await assert.rejects(helper.clockTime(env,binding,{test_clock:'clock_fixture'}),/Aguarde/);assert.equal(bindings,2);advancing=false;
  assert.equal(await helper.canRestart(env,reservation,session,{active:true}),false);
  assert.equal(await helper.canRestart(env,reservation,session,{active:false}),true);
  assert.equal(await helper.canRestart(env,reservation,{status:'open'},{active:false}),false);
  assert.equal(await helper.canRestart(env,reservation,{status:'expired'},{active:false}),true);
  console.log('PASS: isolated Stripe test clock, stable creation keys, reuse, verified time, advancing retry, clock mismatch denial and restart gates. Mocked HTTP.');
 }finally{global.fetch=original;}
})().catch(e=>{console.error(e);process.exitCode=1;});
