const assert = require('node:assert/strict');
const fs = require('node:fs');
const encode = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
(async () => {
 const paypal = encode(fs.readFileSync('functions/_shared/paypal-billing.js','utf8'));
 const helper = encode(fs.readFileSync('functions/_shared/stripe-live.js','utf8').replace('./paypal-billing.js',paypal));
 const checkout = await import(encode(fs.readFileSync('functions/api/stripe/live-checkout.js','utf8')
  .replace('../../_shared/stripe-live.js',helper).replace('../../_shared/paypal-billing.js',paypal)));
 const validation = process.argv.includes('--validation');
 const userId = '569ccf01-6360-479e-8117-28dcdfba2335';
 const expectedAmount = validation ? 100 : 480;
 const expectedPrice = validation ? 'price_validation' : 'price_fixture';
 const env = { STRIPE_LIVE_ENABLED:'true', STRIPE_LIVE_PUBLIC:'false', STRIPE_LIVE_USERS:userId,
  STRIPE_LIVE_SECRET_KEY:'sk_live_fixture', STRIPE_LIVE_PRO_PRICE_ID:'price_fixture',STRIPE_LIVE_ACCOUNT_ID:'acct_fixture',
  SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server' };
 if (validation) Object.assign(env, { STRIPE_LIVE_VALIDATION_ENABLED:'true',
  STRIPE_LIVE_VALIDATION_USER:userId, STRIPE_LIVE_VALIDATION_PRICE_ID:expectedPrice });
 const original = global.fetch;
 let blocked=false,bound=false,existing=false,owner=userId,amount=expectedAmount,url='https://checkout.stripe.com/c/pay/fixture',creations=0;
 let marker=validation?expectedPrice:undefined;
 const json = value => new Response(JSON.stringify(value));
 global.fetch=async(address,options)=>{
  assert.equal(options.redirect,'manual');
  if(address.endsWith('/auth/v1/user')) return json({id:userId});
  if(address.endsWith('/my_commercial_access')) return json({blocked,enforcementActive:true});
  if(address.endsWith('/stripe_live_reserve')) return json({id:'reservation',user_id:userId,created_at:new Date().toISOString(),session_id:bound?'cs_live_fixture':null,subscription_id:existing?'sub_fixture':null});
  if(address.endsWith('/stripe_live_bind')) {bound=true;return json(true);}
  assert.equal(options.headers.Authorization,'Bearer sk_live_fixture');
  if(address.endsWith('/account')) return json({id:'acct_fixture',charges_enabled:true,payouts_enabled:true});
  if(address.endsWith('/prices/'+expectedPrice)) return json({id:expectedPrice,livemode:true,active:true,type:'recurring',currency:'jpy',unit_amount:expectedAmount,billing_scheme:'per_unit',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}});
  assert.ok(address.includes('/checkout/sessions'));
  if(options.method==='POST') {
   creations++;
   const data=new URLSearchParams(options.body);
   assert.equal(data.get('line_items[0][price]'),expectedPrice);
   assert.equal(data.get('metadata[nekuma_validation_price]'),validation?expectedPrice:null);
   assert.equal(data.get('line_items[0][quantity]'),'1');
   assert.equal(data.get('subscription_data[trial_period_days]'),null);
   assert.equal(options.headers['Idempotency-Key'],'nekuma-live-reservation');
  }
  return json({id:'cs_live_fixture',livemode:true,client_reference_id:owner,mode:'subscription',currency:'jpy',amount_total:amount,
   metadata:{nekuma_user:owner,nekuma_plan:'pro',nekuma_validation_price:marker},status:'open',url});
 };
 const run=(data={plan:'pro',quotedAmount:expectedAmount},settings=env,origin='https://app.nekumafinance.app')=>checkout.onRequestPost({env:settings,
  request:new Request(origin+'/api/stripe/live-checkout',{method:'POST',headers:{Origin:origin,Authorization:'Bearer fixture'},body:JSON.stringify(data)})});
 try {
  assert.equal((await run({}, {...env,STRIPE_LIVE_ENABLED:'false'})).status,503);
  assert.equal((await run({plan:'pro'}, {...env,STRIPE_LIVE_USERS:''})).status,403);
  assert.equal((await run({plan:'pro'},env,'https://evil.invalid')).status,403);
  blocked=true;assert.equal((await run()).status,403);blocked=false;
  assert.equal((await run({plan:'family'})).status,400);
  assert.equal((await run({plan:'pro',useClock:true})).status,400);
  assert.equal((await run({plan:'pro',quotedAmount:1})).status,409);
  assert.equal((await run({plan:'pro'})).status,409);
  assert.equal(creations,0);
  assert.equal((await run()).status,200);assert.equal((await run()).status,200);assert.equal(creations,1);
  existing=true;assert.equal((await run()).status,409);existing=false;
  owner='other';assert.equal((await run()).status,403);owner=userId;
  amount=1;assert.equal((await run()).status,403);amount=expectedAmount;
  if(validation) {
   amount=480;marker=undefined;assert.equal((await run()).status,409);amount=100;marker=expectedPrice;
   assert.equal((await run({plan:'pro'}, {...env,STRIPE_LIVE_VALIDATION_USER:'other'})).status,503);
  }
  url='https://evil.invalid';assert.equal((await run()).status,502);
  console.log('PASS: LIVE checkout restriction, origin/block checks, server price, no trial/clock, duplicate reservation, subscription guard, ownership and redirect. Mocked HTTP.');
 }finally{global.fetch=original;}
})().catch(error=>{console.error(error);process.exitCode=1;});
