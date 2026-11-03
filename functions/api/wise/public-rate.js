let cached;
let pending;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: {
  'Content-Type': 'application/json', 'Cache-Control': status === 200 ? 'public, max-age=60, s-maxage=300' : 'no-store'
} });

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.hostname !== 'nekumafinance.app' || url.search) return json({ error: 'Consulta nao suportada.' }, 400);
  if (!env.WISE_RATE_TOKEN) return json({ error: 'Consulta indisponivel.' }, 503);
  try {
    if (!cached || cached.expires <= Date.now()) {
      // One public pair only, coalesced and cached; never forward visitor input.
      pending ||= (async () => {
        const response = await fetch('https://api.wise.com/2026Q4/rates?source=JPY&target=BRL', {
          headers: { Authorization: 'Bearer ' + env.WISE_RATE_TOKEN },
          redirect: 'manual', signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error('provider');
        const rows = await response.json();
        const row = Array.isArray(rows) && rows.find(item => item.source === 'JPY' && item.target === 'BRL');
        const stamp = Date.parse(row?.time);
        if (typeof row?.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0
          || !Number.isFinite(stamp) || stamp > Date.now() + 300000 || stamp < Date.now() - 3600000) throw new Error('rate');
        cached = { body: { source: 'JPY', target: 'BRL', rate: row.rate, time: new Date(stamp).toISOString() }, expires: Date.now() + 300000 };
      })().finally(() => { pending = null; });
      await pending;
    }
    return json(cached.body);
  } catch { return json({ error: 'Consulta Wise temporariamente indisponivel.' }, 503); }
}
