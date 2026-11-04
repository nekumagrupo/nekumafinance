const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHmac } = require('node:crypto');
const encode = value => 'data:text/javascript;base64,' + Buffer.from(value).toString('base64');
(async () => {
 const paypal = encode(fs.readFileSync('functions/_shared/paypal-billing.js','utf8'));
 const stripe = encode(fs.readFileSync('functions/_shared/stripe-billing.js','utf8').replace('./paypal-billing.js',paypal));
 const cycles = encode(fs.readFileSync('functions/_shared/stripe-cycles.js','utf8').replace('./stripe-billing.js',stripe).replace('./paypal-billing.js',paypal));
 const helper = await import(encode(fs.readFileSync('functions/_shared/stripe-webhook.js','utf8')
  .replace('./stripe-billing.js',stripe).replace('./paypal-billing.js',paypal).replace('./stripe-cycles.js',cycles)));
 const liveMode = process.argv.includes('--live');
 const owner = liveMode ? '569ccf01-6360-479e-8117-28dcdfba2335' : 'user';
 const sessionId = liveMode ? 'cs_live_fixture' : 'cs_test_fixture';
 const liveHelper = await import(encode(fs.readFileSync('functions/_shared/stripe-live.js','utf8').replace('./paypal-billing.js',paypal)));
 const env = { STRIPE_BILLING_MODE:'test', STRIPE_TEST_SECRET_KEY:'sk_test_fixture', STRIPE_TEST_WEBHOOK_SECRET:'whsec_fixture',
  STRIPE_TEST_USERS:'user', SUPABASE_URL:'https://db.invalid', SUPABASE_SERVICE_ROLE_KEY:'server' };
 const now = Math.floor(Date.now()/1000);
 Object.assign(env, { STRIPE_LIVE_ENABLED:'true',STRIPE_LIVE_SECRET_KEY:'sk_live_fixture',STRIPE_LIVE_ACCOUNT_ID:'acct_fixture',STRIPE_LIVE_PRO_PRICE_ID:'price_fixture',STRIPE_LIVE_WEBHOOK_SECRET:'whsec_fixture' });
 const verify = request => helper.verifiedStripeEvent(request,env,liveMode);
 const processEvent = event => helper.processStripeTestEvent(env,event,liveMode ? {api:liveHelper.liveStripe,validate:liveHelper.validateLiveSession} : null);
 const event = { id:'evt_fixture', type:'invoice.paid', livemode:false, data:{object:{id:'in_fixture'}} };
 event.livemode=liveMode;
 const raw = JSON.stringify(event);
 const signed = (text=raw, stamp=now, key='whsec_fixture') => new Request('https://nekumafinance.app/api/stripe/webhook',{
  method:'POST',headers:{'Stripe-Signature':`t=${stamp},v1=${createHmac('sha256',key).update(stamp+'.'+text).digest('hex')}`},body:text });
 assert.equal((await verify(signed())).id,event.id);
 await assert.rejects(verify(signed(raw,now-1000)),/invalida/);
 await assert.rejects(verify(signed(raw,now,'whsec_wrong')),/invalida/);
 await assert.rejects(verify(signed(JSON.stringify({...event,livemode:!liveMode}))),/autorizado/);
 const original = global.fetch; let refunded = false, disputed = false, mismatch = false, writes = [], renewal = false;
 const json = value => {
  if(value && typeof value==='object') {
   if('livemode' in value) value.livemode=liveMode;
   if(value.client_reference_id) value.client_reference_id=owner;
   if(value.metadata?.nekuma_user) value.metadata.nekuma_user=owner;
   if(value.id==='cs_test_fixture') value.id=sessionId;
   if(value.lines?.data?.[0]?.price) value.lines.data[0].price.id='price_fixture';
  }
  return new Response(JSON.stringify(value));
 };
 global.fetch = async (url, options) => {
  assert.equal(options.redirect,'manual');
  if(url.endsWith(liveMode ? '/stripe_live_lookup' : '/stripe_test_lookup_subscription')) return json({id:'reservation',user_id:owner,session_id:sessionId});
  if(url.endsWith(liveMode ? '/stripe_live_record' : '/stripe_test_record')) { writes.push(JSON.parse(options.body)); return json(true); }
  if(url.endsWith('/events/evt_fixture')) return json(event);
  if(url.endsWith('/checkout/sessions/'+sessionId)) return json({livemode:false,id:'cs_test_fixture',mode:'subscription',
   client_reference_id:'user',metadata:{nekuma_user:'user',nekuma_plan:'pro'},currency:'jpy',amount_total:480,subscription:'sub_fixture',customer:'cus_fixture'});
  if(url.endsWith('/subscriptions/sub_fixture')) return json({livemode:false,id:'sub_fixture',customer:'cus_fixture',metadata:{nekuma_user:'user',nekuma_plan:'pro'}});
  if(url.endsWith('/invoices/in_fixture')) return json({livemode:false,id:'in_fixture',subscription:'sub_fixture',customer:'cus_fixture',charge:'ch_fixture',
   status:'paid',paid:true,amount_paid:mismatch?1:480,total:480,currency:'jpy',collection_method:'charge_automatically',billing_reason:renewal?'subscription_cycle':'subscription_create',
   lines:{has_more:false,data:[{quantity:1,proration:false,period:{start:now,end:now+30*86400},price:{currency:'jpy',unit_amount:480,recurring:{interval:'month',interval_count:1}}}]}});
  if(url.endsWith('/charges/ch_fixture')) return json({livemode:false,id:'ch_fixture',invoice:'in_fixture',customer:'cus_fixture',status:'succeeded',paid:true,
   amount:480,currency:'jpy',amount_refunded:refunded?480:0,refunded,disputed});
  if(/\/disputes\/(?:dp|du)_fixture$/.test(url)) return json({livemode:false,id:url.split('/').at(-1),charge:'ch_fixture'});
  throw new Error('Unexpected '+url);
 };
 try {
  await processEvent(event); assert.equal(writes.at(-1).effect.action,'paid');
  renewal=true; await processEvent(event); assert.equal(writes.at(-1).effect.action,'paid'); renewal=false;
  event.type='invoice.payment_failed'; await processEvent(event); assert.equal(writes.at(-1).effect.action,'state');
  event.type='invoice.paid';
  refunded=true; await processEvent(event); assert.equal(writes.at(-1).effect.reason,'refund');
  refunded=false; disputed=true; await processEvent(event); assert.equal(writes.at(-1).effect.reason,'dispute'); disputed=false;
  mismatch=true; const before=writes.length; await assert.rejects(processEvent(event),/divergente/); assert.equal(writes.length,before); mismatch=false;
  event.type='customer.subscription.deleted'; event.data.object.id='sub_fixture'; await processEvent(event); assert.equal(writes.at(-1).effect.action,'state');
  event.type='charge.dispute.closed'; event.data.object.id='du_fixture'; await processEvent(event); assert.equal(writes.at(-1).effect.action,'hold');
  assert.equal(writes.at(-1).effect.reason,'dispute');
  for (const type of ['charge.dispute.created','charge.dispute.updated']) {
   event.type=type; await processEvent(event);
   assert.equal(writes.at(-1).effect.action,'hold'); assert.equal(writes.at(-1).effect.reason,'dispute');
  }
  console.log('PASS ('+(liveMode?'LIVE':'TEST')+'): raw HMAC, stale/tampered/cross-mode rejection, provider binding, monthly JPY invoice, refund/dispute holds and cancellation without invented paid periods. Mocked HTTP.');
 } finally { global.fetch=original; }
})().catch(error=>{console.error(error);process.exitCode=1;});
