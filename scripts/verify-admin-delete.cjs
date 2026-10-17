const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const calls=[];let replies=[];
const context={URL,Response,JSON,encodeURIComponent,fetch:async(url,options)=>{calls.push({url,options});const next=replies.shift();assert.ok(next,'Unexpected backend request');return new Response(JSON.stringify(next.body),{status:next.status||200});}};
vm.runInNewContext(fs.readFileSync('functions/api/admin/delete-user.js','utf8').replace('export async function onRequest','async function onRequest')+'\nthis.run=onRequest;',context);
const input={userId:'00000000-0000-4000-8000-000000000006',email:'test@example.invalid',reason:'Test deletion'};
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'server-test'};
const request=(options={})=>new Request('https://nekumafinance.app/api/admin/delete-user',{method:'POST',headers:{Origin:'https://nekumafinance.app','Content-Type':'application/json',Authorization:'Bearer test.token.value',...options.headers},body:JSON.stringify(input)});
(async()=>{
  assert.equal((await context.run({request:request({headers:{Origin:'https://evil.invalid'}}),env})).status,403);assert.equal(calls.length,0);
  assert.equal((await context.run({request:request(),env:{}})).status,503);assert.equal(calls.length,0);
  replies=[{status:401,body:{}}];assert.equal((await context.run({request:request(),env})).status,401);assert.equal(calls.length,1);
  calls.length=0;replies=[{body:{}},{status:403,body:{}}];assert.equal((await context.run({request:request(),env})).status,403);assert.equal(calls.length,2);
  calls.length=0;replies=[{body:{}},{body:'10000000-0000-4000-8000-000000000001'},{body:{}},{status:204,body:null}];
  // 204 responses cannot have bodies; use 200 for this mock audit acknowledgement.
  replies[3].status=200;
  const response=await context.run({request:request(),env});assert.equal(response.status,200);assert.equal((await response.json()).deleted,true);
  assert.equal(calls[0].options.headers.Authorization,'Bearer test.token.value');
  assert.equal(calls[2].options.headers.apikey,'server-test');assert.equal(calls[2].options.method,'DELETE');assert.equal(JSON.parse(calls[2].options.body).should_soft_delete,false);
  assert.equal(JSON.parse(calls[3].options.body).event_type,'account_deleted');
  calls.length=0;replies=[{body:{}},{body:'10000000-0000-4000-8000-000000000001'},{status:500,body:{}},{body:{}}];
  assert.equal((await context.run({request:request(),env})).status,409);assert.equal(JSON.parse(calls[3].options.body).event_type,'account_deletion_failed');
  console.log('PASS: admin deletion endpoint denies bad origins, unavailable secrets, invalid auth and RPC denial; uses server-only credentials and audits success/failure. Mock Auth only.');
})().catch(error=>{console.error(error);process.exitCode=1});
