const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!['nekumafinance.app', 'admin.nekumafinance.app'].includes(url.hostname) || request.headers.get('Origin') !== url.origin) return json({ error: 'Forbidden' }, 403);
  const token = request.headers.get('Authorization') || '';
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(token)) return json({ error: 'Authentication required' }, 401);
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Exclusao ainda nao habilitada no servidor.' }, 503);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'JSON required' }, 415);
  const text = await request.text();
  if (text.length > 2048) return json({ error: 'Request too large' }, 413);
  let input;
  try { input = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!/^[a-f0-9-]{36}$/i.test(input?.userId || '') || typeof input.email !== 'string' || typeof input.reason !== 'string' || input.reason.trim().length < 5 || input.reason.length > 500) return json({ error: 'Invalid request' }, 400);
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  try {
    const headers = { apikey: env.SUPABASE_ANON_KEY, Authorization: token, 'Content-Type': 'application/json' };
    // The Auth service verifies the JWT; the RPC independently enforces allowlist + AAL2.
    const verified = await fetch(base + '/auth/v1/user', { headers });
    if (!verified.ok) return json({ error: 'Sessao invalida ou expirada.' }, 401);
    const allowed = await fetch(base + '/rest/v1/rpc/commercial_admin_authorize_delete', {
      method: 'POST', headers, body: JSON.stringify({ target_user: input.userId, confirmation_email: input.email, change_reason: input.reason })
    });
    if (!allowed.ok) return json({ error: 'Exclusao bloqueada. Confira ADMIN/2FA, confirmacao e titularidade da familia.' }, 403);
    const event = await allowed.json();
    if (typeof event !== 'string' || !/^[a-f0-9-]{36}$/i.test(event)) return json({ error: 'Invalid authorization' }, 502);
    const privileged = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' };
    const removed = await fetch(base + '/auth/v1/admin/users/' + encodeURIComponent(input.userId), {
      method: 'DELETE', headers: privileged, body: JSON.stringify({ should_soft_delete: false })
    });
    const audit = await fetch(base + '/rest/v1/commercial_audit?event_key=eq.' + encodeURIComponent('delete:' + event), {
      method: 'PATCH', headers: { ...privileged, Prefer: 'return=minimal' },
      body: JSON.stringify({ event_type: removed.ok ? 'account_deleted' : 'account_deletion_failed' })
    });
    if (!removed.ok) return json({ error: 'Exclusao nao concluida. Existem dados vinculados ou uma protecao do banco. Nenhum dado financeiro foi removido por este painel.' }, 409);
    if (!audit.ok) return json({ error: 'Conta excluida, mas a conclusao da auditoria precisa ser verificada antes de repetir a operacao.' }, 502);
    return json({ deleted: true });
  } catch { return json({ error: 'Operacao interrompida. Confira o cadastro e a auditoria antes de tentar novamente.' }, 502); }
}
