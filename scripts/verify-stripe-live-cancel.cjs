const assert = require('node:assert/strict');
const fs = require('node:fs');
const encode = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
(async () => {
 const paypal=encode(fs.readFileSync('functions/_shared/paypal-billing.js','utf8'));
 const live=encode(fs.readFileSync('functions/_shared/stripe-live.js','utf8').replace('./paypal-billing.js',paypal));
 const subscription=encode(fs.readFileSync('functions/_shared/stripe-live-subscription.js','utf8').replace('./stripe-live.js',live).replace('./paypal-billing.js',paypal));
 const cancel=await import(encode(fs.readFileSync('functions/api/stripe/live-cancel.js','utf8')
  .replace('../../_shared/stripe-live.js',live).replace('../../_shared/stripe-live-subscription.js',subscription).replace('../../_shared/paypal-billing.js',paypal)));
 const env={STRIPE_LIVE_ENABLED:'true',STRIPE_LIVE_USERS:'user',STRIPE_LIVE_SECRET_KEY:'sk_live_fixture',
  STRIPE_LIVE_PRO_PRICE_ID:'price_fixture',STRIPE_LIVE_ACCOUNT_ID:'acct_fixture',SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server'};
 const original=global.fetch;
 let owner='user',cancelled=false,posts=0;
 const json=value=>new Response(JSON.stringify(value));
 global.fetch=async(url,options)=>{
  if(url.endsWith('/auth/v1/user'))return json({id:'user'});
  if(url.endsWith('/my_commercial_access'))return json({enforcementActive:true,blocked:false});
  if(url.endsWith('/stripe_live_lookup'))return json({id:'reserve',user_id:'user',session_id:'cs_live_fixture',subscription_id:'sub_fixture'});
  if(url.endsWith('/checkout/sessions/cs_live_fixture'))return json({id:'cs_live_fixture',livemode:true,client_reference_id:'user',mode:'subscription',currency:'jpy',amount_total:480,metadata:{nekuma_user:'user',nekuma_plan:'pro'},customer:'cus_fixture',subscription:'sub_fixture'});
  assert.ok(url.endsWith('/subscriptions/sub_fixture'));
  if(options.method==='POST'){
   posts++;assert.equal(new URLSearchParams(options.body).get('cancel_at_period_end'),'true');
   assert.equal(options.headers['Idempotency-Key'],'nekuma-live-cancel-sub_fixture-569ccf01-6360-479e-8117-28dcdfba2335');cancelled=true;
  }
  return json({id:'sub_fixture',livemode:true,status:'active',metadata:{nekuma_user:owner,nekuma_plan:'pro'},customer:'cus_fixture',cancel_at_period_end:cancelled});
 };
 const run=(confirm=true)=>cancel.onRequestPost({env,request:new Request('https://app.nekumafinance.app/api/stripe/live-cancel',{
  method:'POST',headers:{Origin:'https://app.nekumafinance.app',Authorization:'Bearer fixture'},body:JSON.stringify({cancelRenewal:confirm,attempt:'569ccf01-6360-479e-8117-28dcdfba2335'})})});
 try{
  assert.equal((await run(false)).status,400);assert.equal(posts,0);
  owner='other';assert.equal((await run()).status,403);assert.equal(posts,0);owner='user';
  assert.equal((await run()).status,200);assert.equal(posts,1);
  assert.equal((await run()).status,200);assert.equal(posts,1);
  console.log('PASS: authenticated LIVE renewal cancellation, explicit confirmation, subscription ownership, no refund or immediate cancellation, idempotent retry. Mocked HTTP.');
 }finally{global.fetch=original;}
})().catch(error=>{console.error(error);process.exitCode=1;});
