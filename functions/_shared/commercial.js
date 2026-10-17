export async function commercialAccess(env, authorization, feature = null) {
  const base = (env.SUPABASE_URL || env.PONTE_SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_ANON_KEY || env.PONTE_SUPABASE_ANON_KEY;
  if (!base || !key) return { error: 'Permissoes dos planos indisponiveis.', status: 503 };
  try {
    const response = await fetch(base + '/rest/v1/rpc/my_commercial_access', {
      method: 'POST', headers: { apikey: key, Authorization: authorization, 'Content-Type': 'application/json' },
      body: '{}', signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return { error: 'Nao foi possivel validar o plano.', status: response.status === 401 ? 401 : 503 };
    const access = await response.json();
    if (access?.blocked) return { error: 'Conta bloqueada. Entre em contato com o suporte.', status: 403 };
    if (!access?.enforcementActive || !['free','pro','family'].includes(access.plan)) return { error: 'Permissoes dos planos ainda nao foram ativadas.', status: 503 };
    if (feature && !access.limits?.features?.includes(feature)) return { error: 'Recurso exclusivo do plano PRO ou Familia.', status: 403, code: 'PLAN_REQUIRED' };
    return { access, base, key };
  } catch { return { error: 'Nao foi possivel validar o plano agora.', status: 503 }; }
}

export async function reserveReceiptScan(access, authorization, household) {
  try {
    const response = await fetch(access.base + '/rest/v1/rpc/reserve_commercial_scan', {
      method: 'POST', headers: { apikey: access.key, Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_household: household || null }), signal: AbortSignal.timeout(10000)
    });
    const data = await response.json();
    if (!response.ok) return { error: String(data.message || '').includes('SCAN_LIMIT') ? 'Limite mensal de scans atingido.' : 'Nao foi possivel autorizar esta leitura.', status: String(data.message || '').includes('SCAN_LIMIT') ? 429 : 403 };
    return { usage: data };
  } catch { return { error: 'Controle de scans indisponivel. Nenhuma leitura foi iniciada.', status: 503 }; }
}
