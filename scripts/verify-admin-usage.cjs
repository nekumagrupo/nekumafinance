const assert=require('node:assert/strict');
(async()=>{
 const source=require('esbuild').buildSync({entryPoints:['functions/api/admin/usage.js'],bundle:true,write:false,format:'esm',platform:'neutral'}).outputFiles[0].text;
 const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const original=global.fetch;let admin=true,mfa=true,providerCalls=0,fail=false,badShape=false;
 const env={SUPABASE_URL:'https://ysggihygadpfjyywtvyy.supabase.co',SUPABASE_ANON_KEY:'anon',RESEND_USAGE_API_KEY:'private-resend',SUPABASE_USAGE_TOKEN:'private-supabase'};
 const req=(host='nekumafinance.app',token=true)=>new Request('https://'+host+'/api/admin/usage',{method:'POST',headers:{Origin:'https://'+host,...(token?{Authorization:'Bearer test'}:{})}});
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status});
 try{
  global.fetch=async(url,options)=>{
   if(options.redirect!=='manual')throw new TypeError('workerd accepts only follow/manual; monitor must not follow redirects');
   if(String(url).endsWith('/rest/v1/rpc/commercial_admin_overview'))return admin&&mfa?json({databaseBytes:123,rows:[{email:'must-not-leak'}]}):json({message:'Denied'},403);
   providerCalls++;
   if(fail)return json({secret:'private-resend'},403);
   if(badShape)return json({emails:{daily:{used:'unknown',limit:100}}});
   if(url==='https://api.resend.com/usage'){assert.equal(options.headers.Authorization,'Bearer private-resend');return json({emails:{daily:{used:80,limit:100,resets_at:'2026-10-18T00:00:00Z'},monthly:{used:2800,limit:3000}}});}
   if(String(url).startsWith('https://api.resend.com/emails/metrics?'))return json({totals:{sent:3,delivered:3,bounced:0,complained:0,failed:0,delivery_rate:100,bounce_rate:0,complaint_rate:0}});
   if(String(url).endsWith('/analytics/endpoints/metrics'))return new Response('node_memory_MemTotal_bytes 1000\nnode_memory_MemAvailable_bytes 500\n');
   assert.ok(url.startsWith('https://api.supabase.com/v1/projects/ysggihygadpfjyywtvyy/analytics/'));
   return json({result:[{timestamp:'2026-10-17T00:00:00Z',total_auth_requests:10,total_rest_requests:20,total_storage_requests:0,total_realtime_requests:3}]});
  };
  assert.equal((await onRequest({request:req('app.nekumafinance.app'),env})).status,403);
  assert.equal((await onRequest({request:req('nekumafinance.app',false),env})).status,401);
  admin=false;assert.equal((await onRequest({request:req(),env})).status,403);assert.equal(providerCalls,0);
  admin=true;mfa=false;assert.equal((await onRequest({request:req(),env})).status,403);assert.equal(providerCalls,0);
  mfa=true;const response=await onRequest({request:req(),env});assert.equal(response.headers.get('Cache-Control'),'no-store');const result=await response.json();
  assert.equal(result.resend.daily.remaining,20);assert.equal(result.resend.monthly.remaining,200);assert.equal(result.supabase.requests.total_storage_requests,0);assert.equal(providerCalls,4);
  assert.equal(result.emailMetrics.totals.delivery_rate,100);assert.equal(result.emailMetrics.totals.sent,3);assert.equal(result.infrastructure.memory.percent,50);
  assert.ok(!JSON.stringify(result).includes('private-'));assert.ok(!JSON.stringify(result).includes('must-not-leak'));
  await onRequest({request:req(),env});assert.equal(providerCalls,4,'Server cache avoids repeat provider requests');
  admin=false;assert.equal((await onRequest({request:req(),env})).status,403,'Cached metrics never bypass fresh admin/MFA check');admin=true;
  const missing=await (await onRequest({request:req(),env:{SUPABASE_URL:env.SUPABASE_URL,SUPABASE_ANON_KEY:'anon'}})).json();assert.equal(missing.resend.reason,'not_configured');
  fail=true;const denied=await (await onRequest({request:req(),env:{...env,USAGE_CACHE_VERSION:'denied'}})).json();assert.equal(denied.resend.reason,'credential_permissions');assert.ok(!JSON.stringify(denied).includes('private-'));
  assert.equal(denied.infrastructure.reason,'infrastructure_permissions');
  fail=false;badShape=true;const invalid=await (await onRequest({request:req(),env:{...env,USAGE_CACHE_VERSION:'invalid'}})).json();assert.equal(invalid.resend.reason,'invalid_response');
  console.log('PASS: usage endpoint verifies fresh ADMIN/AAL2 before providers/cache, denies app origin and guests, protects secrets/user rows, sanitizes counters, caches reads, and reports missing/invalid providers without fabricated zeros. Mocked HTTP tests.');
 }finally{global.fetch=original;}
})().catch(error=>{console.error(error);process.exitCode=1});
