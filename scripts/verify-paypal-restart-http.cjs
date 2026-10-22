const assert=require('node:assert/strict');const fs=require('node:fs');
const encode=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
(async()=>{
 const helper=encode(fs.readFileSync('functions/_shared/paypal-billing.js','utf8'));
 const checkout=await import(encode(fs.readFileSync('functions/api/paypal/checkout.js','utf8').replace('../../_shared/paypal-billing.js',helper)));
 const env={PAYPAL_BILLING_MODE:'sandbox',PAYPAL_SANDBOX_PROFILE:'legacy',PAYPAL_SANDBOX_CLIENT_ID:'test',PAYPAL_SANDBOX_CLIENT_SECRET:'secret',PAYPAL_SANDBOX_WEBHOOK_ID:'WH',PAYPAL_SANDBOX_PRO_PLAN_ID:'P-PRO',PAYPAL_SANDBOX_FAMILY_PLAN_ID:'P-FAMILY',SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server-only',PAYPAL_SANDBOX_TEST_USERS:'user',PAYPAL_SANDBOX_LEDGER_ENABLED:'true',PAYPAL_SANDBOX_ACCESS_ENABLED:'true'};
 let restarted=false,bound=false,paid=false,creations=0,paypalCalls=0;
 const json=data=>new Response(JSON.stringify(data));const original=global.fetch;
 global.fetch=async(url,options)=>{
  url=String(url);assert.ok(!url.includes('api-m.paypal.com'));assert.equal(options.redirect,'manual');
  const id=restarted?'new':'old';
  if(url.endsWith('/auth/v1/user'))return json({id:'user'});
  if(url.endsWith('/my_commercial_access'))return json({enforcementActive:true});
  if(url.includes('api-m.sandbox.paypal.com'))paypalCalls++;
  if(url.endsWith('/oauth2/token'))return json({access_token:'test-token'});
  if(url.endsWith('/billing/plans/P-PRO'))return json({status:'ACTIVE',billing_cycles:[{tenure_type:'REGULAR',frequency:{interval_unit:'MONTH',interval_count:1},total_cycles:0,pricing_scheme:{fixed_price:{currency_code:'JPY',value:'480'}}}]});
  if(url.endsWith('/paypal_sandbox_reserve'))return json({id,plan:'pro',merchant_profile:'legacy',created_at:new Date().toISOString(),subscription_id:restarted?(bound?'I-NEW':null):'I-OLD'});
  if(url.endsWith('/billing/subscriptions/I-OLD'))return json({id:'I-OLD',custom_id:'old',plan_id:'P-PRO',status:'CANCELLED',update_time:new Date().toISOString()});
  if(url.endsWith('/paypal_sandbox_entitlement'))return json({active:paid,reason:paid?'paid':'payment_review'});
  if(url.endsWith('/paypal_sandbox_sync_state'))return json(true);
  if(url.endsWith('/paypal_sandbox_restart')){assert.deepEqual(JSON.parse(options.body),{target_user:'user',target_checkout:'old',target_profile:'legacy'});restarted=true;return json({id:'new',plan:'pro',created_at:new Date().toISOString(),subscription_id:null});}
  if(url.endsWith('/billing/subscriptions')){creations++;assert.equal(JSON.parse(options.body).custom_id,'new');return json({id:'I-NEW',status:'APPROVAL_PENDING',links:[{rel:'approve',href:'https://www.sandbox.paypal.com/approve'}]});}
  if(url.endsWith('/paypal_sandbox_bind')){bound=true;return json(true);}
  if(url.endsWith('/billing/subscriptions/I-NEW'))return json({id:'I-NEW',custom_id:'new',plan_id:'P-PRO',status:'APPROVAL_PENDING',links:[{rel:'approve',href:'https://www.sandbox.paypal.com/approve'}]});
  throw new Error('Unexpected '+url);
 };
 const request=plan=>new Request('https://app.nekumafinance.app/api/paypal/checkout',{method:'POST',headers:{Origin:'https://app.nekumafinance.app',Authorization:'Bearer user-token'},body:JSON.stringify({plan})});
 try{
  assert.equal((await checkout.onRequestPost({env,request:request('family')})).status,409);assert.equal(paypalCalls,0);
  paid=true;assert.equal((await checkout.onRequestPost({env,request:request('pro')})).status,409);assert.equal(creations,0);
  paid=false;const response=await checkout.onRequestPost({env,request:request('pro')});assert.equal(response.status,200);assert.equal((await response.json()).environment,'sandbox');assert.equal(creations,1);
  assert.equal((await checkout.onRequestPost({env,request:request('pro')})).status,200);assert.equal(creations,1);
  console.log('PASS: restart after refund, paid cancellation denied, subsequent approval resumed without duplicate creation and Family rejected before PayPal calls. Mocked HTTP only.');
 }finally{global.fetch=original;}
})().catch(e=>{console.error(e);process.exitCode=1;});
