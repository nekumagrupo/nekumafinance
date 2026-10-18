const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const source=fs.readFileSync('functions/api/paypal/balance.js','utf8');
 const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const original=global.fetch;let valid=true,unavailable=false,calls=[];
 const env={SUPABASE_URL:'https://auth.invalid',SUPABASE_ANON_KEY:'public',PAYPAL_CLIENT_ID:'mock-client-id-long',PAYPAL_CLIENT_SECRET:'mock-secret',PAYPAL_ALLOWED_EMAILS:'owner@example.invalid'};
 const request=token=>new Request('https://app.nekumafinance.app/api/paypal/balance',{headers:token?{Authorization:'Bearer mock-token'}:{}});
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
 try{
  global.fetch=async(url,options)=>{
   calls.push(String(url));
   if(String(url).endsWith('/auth/v1/user'))return valid?json({id:'owner',email:'owner@example.invalid'}):json({},401);
   assert.ok(String(url).startsWith('https://api-m.sandbox.paypal.com/'),'Tests must never use live payments');
   if(String(url).endsWith('/v1/oauth2/token')){assert.equal(options.body,'grant_type=client_credentials');return json({access_token:'mock-paypal-token'});}
   assert.equal(new URL(url).pathname,'/v1/reporting/balances');assert.equal(options.headers.Authorization,'Bearer mock-paypal-token');
   return unavailable?json({name:'RESOURCE_NOT_FOUND',message:'Specified resource does not exist'},404):json({balances:[{currency_code:'JPY',total_balance:{value:'480'},available_balance:{value:'480'}}]});
  };
  assert.equal((await api.onRequestGet({request:request(false),env})).status,401);assert.equal(calls.length,0);
  valid=false;assert.equal((await api.onRequestGet({request:request(true),env})).status,401);valid=true;
  assert.equal((await api.onRequestGet({request:request(true),env:{...env,PAYPAL_ALLOWED_EMAILS:''}})).status,403);
  assert.equal((await api.onRequestGet({request:request(true),env:{...env,PAYPAL_REQUIRE_AUTH:'false'}})).status,403);
  assert.equal((await api.onRequestGet({request:request(true),env:{...env,PAYPAL_ALLOWED_EMAILS:'other@example.invalid'}})).status,403);
  assert.equal((await api.onRequestGet({request:request(true),env:{...env,PAYPAL_CLIENT_SECRET:''}})).status,500);
  const response=await api.onRequestGet({request:request(true),env});const data=await response.json();
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(data.env,'sandbox');assert.equal(data.balances[0].currency,'JPY');assert.equal(data.balances[0].total,480);
  assert.ok(!JSON.stringify(data).includes('mock-secret'));assert.ok(!JSON.stringify(data).includes('mock-paypal-token'));
  unavailable=true;const limited=await (await api.onRequestGet({request:request(true),env})).json();assert.equal(limited.status,'limited');assert.equal(limited.balanceUnavailable,true);
  console.log('PASS: existing balance API authentication, configured allowlist, Sandbox default, JPY parsing, unavailable-balance state and no secret/token in successful responses. Mocked HTTP only; no real PayPal request or payment.');
 }finally{global.fetch=original;}
})().catch(error=>{console.error(error);process.exitCode=1});
