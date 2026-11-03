const currencies = new Set(['USD', 'BRL', 'JPY', 'EUR', 'GBP']);
const rates = new Map();
const respond = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export async function onRequestPost({ request, env }) {
  const origin = new URL(request.url).origin;
  if (!['https://app.nekumafinance.app', 'https://nekumafinance.app'].includes(origin)
    || request.headers.get('Origin') !== origin) return respond({ error: 'Origem nao autorizada.' }, 403);
  if (!env.WISE_RATE_TOKEN || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return respond({ error: 'Consulta Wise ainda nao configurada.' }, 503);
  try {
    const authorization = request.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) return respond({ error: 'Entre na sua conta.' }, 401);
    const auth = await fetch(env.SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user', {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization },
      redirect: 'manual', signal: AbortSignal.timeout(10000)
    });
    if (!auth.ok || !(await auth.json()).id) return respond({ error: 'Sessao indisponivel.' }, 401);
    const url = new URL(request.url);
    const source = url.searchParams.get('source'), target = url.searchParams.get('target');
    if (!currencies.has(source) || !currencies.has(target) || source === target) return respond({ error: 'Par de moedas nao suportado.' }, 400);
    const key = source + ':' + target;
    let result = rates.get(key);
    if (!result || result.expires <= Date.now()) {
      const response = await fetch('https://api.wise.com/2026Q4/rates?' + new URLSearchParams({ source, target }), {
        headers: { Authorization: 'Bearer ' + env.WISE_RATE_TOKEN }, redirect: 'manual', signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('provider');
      const data = await response.json();
      const row = Array.isArray(data) && data.find(item => item.source === source && item.target === target);
      const timestamp = Date.parse(row?.time);
      if (!(typeof row?.rate === 'number' && row.rate > 0 && Number.isFinite(row.rate))
        || !Number.isFinite(timestamp) || timestamp > Date.now() + 300000 || timestamp < Date.now() - 3600000) throw new Error('rate');
      result = { rate: row.rate, time: new Date(timestamp).toISOString(), expires: Date.now() + 60000 };
      rates.set(key, result);
    }
    let affiliateUrl = null;
    if (env.WISE_AFFILIATE_APPROVED === 'true') {
      try {
        const link = new URL(env.WISE_AFFILIATE_URL);
        if (link.protocol === 'https:' && ['wise.com', 'wise.prf.hn'].includes(link.hostname) && !link.username && !link.password) affiliateUrl = link.href;
      } catch { /* An invalid campaign must not produce a public link. */ }
    }
    return respond({ source, target, rate: result.rate, time: result.time, affiliateUrl });
  } catch {
    return respond({ error: 'Wise indisponivel. A cotacao anterior foi preservada.' }, 503);
  }
}
