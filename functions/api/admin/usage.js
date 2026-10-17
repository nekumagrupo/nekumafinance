const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
const cache = new Map();
const count = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
function quota(value) {
  if (!value || count(value.used) === null || !(value.limit === null || count(value.limit) !== null)) return null;
  return { used: value.used, limit: value.limit, remaining: value.limit === null ? null : Math.max(0, value.limit - value.used),
    resetsAt: typeof value.resets_at === 'string' && Number.isFinite(Date.parse(value.resets_at)) ? value.resets_at : null };
}
async function cached(key, read) {
  const previous = cache.get(key);
  if (previous && previous.until > Date.now()) return previous.promise;
  if (cache.size >= 4) cache.delete(cache.keys().next().value);
  const entry = { until: Date.now() + 300000, promise: read() };
  cache.set(key, entry);
  const value = await entry.promise;
  if (!value.connected) entry.until = Date.now() + 30000;
  return value;
}
async function providerJson(url, token) {
  const response = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) return { error: response.status === 401 || response.status === 403 ? 'credential_permissions' : 'provider_unavailable' };
  const text = await response.text();
  if (text.length > 2000000) return { error: 'invalid_response' };
  try { return { data: JSON.parse(text) }; } catch { return { error: 'invalid_response' }; }
}
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!['nekumafinance.app', 'admin.nekumafinance.app'].includes(url.hostname) || request.headers.get('Origin') !== url.origin) return json({ error: 'Forbidden' }, 403);
  const authorization = request.headers.get('Authorization') || '';
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(authorization)) return json({ error: 'Authentication required' }, 401);
  const base = (env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const anonKey = (env.SUPABASE_ANON_KEY || '').trim();
  if (!base || !anonKey) return json({ error: 'SUPABASE_URL ou SUPABASE_ANON_KEY ausente no ambiente desta implantacao.' }, 503);
  try {
    // RPC verifies JWT, live ADMIN allowlist and AAL2 before any provider/cache read.
    const allowed = await fetch(base + '/rest/v1/rpc/commercial_admin_overview', {
      method: 'POST', headers: { Authorization: authorization, apikey: anonKey, 'Content-Type': 'application/json' },
      body: '{"page_number":0}', signal: AbortSignal.timeout(10000), redirect: 'error'
    });
    if (!allowed.ok) {
      if (allowed.status === 401) return json({ error: 'Supabase recusou a sessao ou a chave publica configurada no Cloudflare. Entre novamente e confira o projeto dos secrets.' },401);
      if (allowed.status === 403) return json({ error: 'Acesso exige ADMIN e autenticador 2FA no projeto configurado no servidor.' },403);
      return json({ error: 'Validacao administrativa indisponivel no Supabase (HTTP '+allowed.status+').' },503);
    }
    const overview = await allowed.json();
    const ref = new URL(base).hostname.split('.')[0];
    const unavailable = reason => ({ connected: false, reason });
    let resend = unavailable('not_configured'), supabase = unavailable('not_configured');
    // Keep the monitor key separate from support/SMTP sending credentials.
    const resendKey = env.RESEND_USAGE_API_KEY;
    if (resendKey) resend = await cached('resend:' + (env.USAGE_CACHE_VERSION || '1'), async () => {
      try {
        const result = await providerJson('https://api.resend.com/usage', resendKey);
        if (result.error) return unavailable(result.error);
        const daily = quota(result.data.emails?.daily), monthly = quota(result.data.emails?.monthly);
        if (!daily && !monthly) return unavailable('invalid_response');
        return { connected: true, measuredAt: new Date().toISOString(), daily, monthly };
      } catch { return unavailable('provider_unavailable'); }
    });
    if (env.SUPABASE_USAGE_TOKEN && /^[a-z0-9]{20}$/.test(ref)) supabase = await cached('supabase:' + ref + ':' + (env.USAGE_CACHE_VERSION || '1'), async () => {
      try {
        const result = await providerJson('https://api.supabase.com/v1/projects/' + ref + '/analytics/endpoints/usage.api-counts', env.SUPABASE_USAGE_TOKEN);
        if (result.error) return unavailable(result.error);
        if (!Array.isArray(result.data.result) || result.data.error || !result.data.result.length) return unavailable('no_data');
        const keys = ['total_auth_requests','total_realtime_requests','total_rest_requests','total_storage_requests'];
        const totals = Object.fromEntries(keys.map(key => [key, null]));
        const times = [];
        for (const row of result.data.result) {
          for (const key of keys) if (count(row[key]) !== null) totals[key] = (totals[key] || 0) + row[key];
          if (typeof row.timestamp === 'string' && Number.isFinite(Date.parse(row.timestamp))) times.push(row.timestamp);
        }
        if (Object.values(totals).every(value => value === null)) return unavailable('no_data');
        times.sort((a,b) => Date.parse(a)-Date.parse(b));
        return { connected: true, measuredAt: new Date().toISOString(), requests: totals, from: times[0] || null, to: times.at(-1) || null };
      } catch { return unavailable('provider_unavailable'); }
    });
    return json({ measuredAt: new Date().toISOString(), cacheSeconds: 300, databaseBytes: count(overview.databaseBytes), resend, supabase });
  } catch { return json({ error: 'Monitoramento indisponivel. Tente novamente.' }, 503); }
}
