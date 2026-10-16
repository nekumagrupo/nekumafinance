const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
  const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('functions/api/support.js','utf8')).toString('base64'));
  const env={RESEND_API_KEY:'test',TURNSTILE_SECRET_KEY:'test',TURNSTILE_SITE_KEY:'public'};
  const valid={name:'Teste',email:'teste@example.com',message:'Uma pergunta de teste.',token:'test'};
  const request=(body,origin='https://nekumafinance.app')=>new Request('https://nekumafinance.app/api/support',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await onRequest({request:request(valid),env:{}})).status,503);
  assert.equal((await onRequest({request:request(valid,'https://evil.example'),env})).status,403);
  assert.equal((await onRequest({request:request({...valid,email:'bad'}),env})).status,400);
  assert.equal((await onRequest({request:request({...valid,message:'x'.repeat(25000)}),env})).status,413);
  let calls=0;
  global.fetch=async()=>{calls++;return Response.json({success:false});};
  assert.equal((await onRequest({request:request(valid),env})).status,400);
  assert.equal(calls,1);
  global.fetch=async(url,options)=>{
    if(url.includes('siteverify'))return Response.json({success:true,hostname:'nekumafinance.app',action:'support'});
    const payload=JSON.parse(options.body);
    assert.deepEqual(payload.to,['suporte@nekumafinance.app']);
    assert.equal(payload.reply_to,valid.email);
    return Response.json({id:'mock-id'});
  };
  assert.equal((await onRequest({request:request(valid),env})).status,200);
  console.log('Support validation and mocked delivery passed. No real email sent.');
})();
