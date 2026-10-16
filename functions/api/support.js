const hosts = new Set(['nekumafinance.app', 'app.nekumafinance.app']);
const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

export async function onRequest({request, env}) {
  const url = new URL(request.url);
  if (!hosts.has(url.hostname)) return json({error:'Invalid host'},403);
  if (!['GET','POST'].includes(request.method)) return json({error:'Method not allowed'},405);
  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) return json({error:'Support unavailable'},503);
  if (request.method === 'GET') return json({siteKey:env.TURNSTILE_SITE_KEY});
  if (request.headers.get('Origin') !== url.origin) return json({error:'Invalid origin'},403);
  if (!request.headers.get('Content-Type')?.includes('application/json')) return json({error:'JSON required'},415);
  // Bound the stream before parsing; Content-Length alone is not trustworthy.
  const reader = request.body?.getReader();
  if (!reader) return json({error:'Empty body'},400);
  let size=0, chunks=[];
  try {
    while (true) {
      const {done,value}=await reader.read();
      if (done) break;
      size+=value.byteLength;
      if (size>24000) { await reader.cancel(); return json({error:'Body too large'},413); }
      chunks.push(value);
    }
    const bytes=new Uint8Array(size);
    let offset=0;
    for (const chunk of chunks) { bytes.set(chunk,offset); offset+=chunk.length; }
    const data=JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data!=='object') return json({error:'Invalid fields'},400);
    const {name,email,message,token}=data;
    if ([name,email,message,token].some(value=>typeof value!=='string') || !name.trim() || name.length>100 || email.length>254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n]/.test(name) || message.trim().length<10 || message.length>4000 || !token || token.length>2048) return json({error:'Invalid fields'},400);
    const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:request.headers.get('CF-Connecting-IP')||''}),signal:AbortSignal.timeout(10000)});
    if (!verification.ok) return json({error:'Verification unavailable'},502);
    const result=await verification.json();
    if (!result.success || result.action!=='support' || result.hostname!==url.hostname) return json({error:'Verification failed'},400);
    const delivery=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:'Nekuma Finance <naoresponda@nekumafinance.app>',to:['suporte@nekumafinance.app'],reply_to:email,subject:'Contato pelo site Nekuma Finance',text:`Nome: ${name.trim()}\nEmail: ${email}\n\n${message.trim()}`}),signal:AbortSignal.timeout(10000)});
    if (!delivery.ok) return json({error:'Delivery unavailable'},502);
    return json({ok:true});
  } catch (error) {
    return json({error:error instanceof SyntaxError?'Invalid JSON':'Support unavailable'},error instanceof SyntaxError?400:502);
  }
}
