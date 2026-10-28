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
 const env = { STRIPE_BILLING_MODE:'test', STRIPE_TEST_SECRET_KEY:'sk_test_fixture', STRIPE_TEST_WEBHOOK_SECRET:'whsec_fixture',
  STRIPE_TEST_USERS:'user', SUPABASE_URL:'https://db.invalid', SUPABASE_SERVICE_ROLE_KEY:'server' };
 const now = Math.floor(Date.now()/1000);
 const event = { id:'evt_fixture', type:'invoice.paid', livemode:false, data:{object:{id:'in_fixture'}} };
 const raw = JSON.stringify(event);
 const signed = (text=raw, stamp=now, key='whsec_fixture') => new Request('https://nekumafinance.app/api/stripe/webhook',{
  method:'POST',headers:{'Stripe-Signature':`t=${stamp},v1=${createHmac('sha256',key).update(stamp+'.'+text).digest('hex')}`},body:text });
 assert.equal((await helper.verifiedStripeEvent(signed(),env)).id,event.id);
 await assert.rejects(helper.verifiedStripeEvent(signed(raw,now-1000),env),/invalida/);
 await assert.rejects(helper.verifiedStripeEvent(signed(raw,now,'whsec_wrong'),env),/invalida/);
 await assert.rejects(helper.verifiedStripeEvent(signed(JSON.stringify({...event,livemode:true})),env),/autorizado/);
 const original = global.fetch; let refunded = false, disputed = false, mismatch = false, writes = [], renewal = false;
 const json = value => new Response(JSON.stringify(value));
 global.fetch = async (url, options) => {
  assert.equal(options.redirect,'manual');
  if(url.endsWith('/stripe_test_lookup_subscription')) return json({id:'reservation',user_id:'user',session_id:'cs_test_fixture'});
  if(url.endsWith('/stripe_test_record')) { writes.push(JSON.parse(options.body)); return json(true); }
  if(url.endsWith('/events/evt_fixture')) return json(event);
  if(url.endsWith('/checkout/sessions/cs_test_fixture')) return json({livemode:false,id:'cs_test_fixture',mode:'subscription',
   client_reference_id:'user',metadata:{nekuma_user:'user',nekuma_plan:'pro'},currency:'jpy',amount_total:480,subscription:'sub_fixture',customer:'cus_fixture'});
  if(url.endsWith('/subscriptions/sub_fixture')) return json({livemode:false,id:'sub_fixture',customer:'cus_fixture',metadata:{nekuma_user:'user',nekuma_plan:'pro'}});
  if(url.endsWith('/invoices/in_fixture')) return json({livemode:false,id:'in_fixture',subscription:'sub_fixture',customer:'cus_fixture',charge:'ch_fixture',
   status:'paid',paid:true,amount_paid:mismatch?1:480,total:480,currency:'jpy',collection_method:'charge_automatically',billing_reason:renewal?'subscription_cycle':'subscription_create',
   lines:{has_more:false,data:[{quantity:1,proration:false,period:{start:now,end:now+30*86400},price:{currency:'jpy',unit_amount:480,recurring:{interval:'month',interval_count:1}}}]}});
  if(url.endsWith('/charges/ch_fixture')) return json({livemode:false,id:'ch_fixture',invoice:'in_fixture',customer:'cus_fixture',status:'succeeded',paid:true,
   amount:480,currency:'jpy',amount_refunded:refunded?480:0,refunded,disputed});
  if(url.endsWith('/disputes/dp_fixture')) return json({livemode:false,id:'dp_fixture',charge:'ch_fixture'});
  throw new Error('Unexpected '+url);
 };
 try {
  await helper.processStripeTestEvent(env,event); assert.equal(writes.at(-1).effect.action,'paid');
  renewal=true; await helper.processStripeTestEvent(env,event); assert.equal(writes.at(-1).effect.action,'paid'); renewal=false;
  event.type='invoice.payment_failed'; await helper.processStripeTestEvent(env,event); assert.equal(writes.at(-1).effect.action,'state');
  event.type='invoice.paid';
  refunded=true; await helper.processStripeTestEvent(env,event); assert.equal(writes.at(-1).effect.reason,'refund');
  refunded=false; disputed=true; await helper.processStripeTestEvent(env,event); assert.equal(writes.at(-1).effect.reason,'dispute'); disputed=false;
  mismatch=true; const before=writes.length; await assert.rejects(helper.processStripeTestEvent(env,event),/divergente/); assert.equal(writes.length,before); mismatch=false;
  event.type='customer.subscription.deleted'; event.data.object.id='sub_fixture'; await helper.processStripeTestEvent(env,event); assert.equal(writes.at(-1).effect.action,'state');
  event.type='charge.dispute.closed'; event.data.object.id='dp_fixture'; await helper.processStripeTestEvent(env,event); assert.equal(writes.at(-1).effect.action,'hold');
  assert.equal(writes.at(-1).effect.reason,'dispute');
  for (const type of ['charge.dispute.created','charge.dispute.updated']) {
   event.type=type; await helper.processStripeTestEvent(env,event);
   assert.equal(writes.at(-1).effect.action,'hold'); assert.equal(writes.at(-1).effect.reason,'dispute');
  }
  console.log('PASS: raw HMAC, stale/tampered/live rejection, provider binding, validated monthly JPY invoice, refund/dispute holds and cancellation without invented paid periods. Mocked HTTP.');
 } finally { global.fetch=original; }
})().catch(error=>{console.error(error);process.exitCode=1;});
