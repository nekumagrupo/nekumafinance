const API = 'https://api-m.sandbox.paypal.com';
export function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export function billingEnvironment(env, profile = env.PAYPAL_SANDBOX_PROFILE || 'legacy') {
  if (!['legacy', 'jp'].includes(profile)) fail(503, 'Perfil Sandbox invalido.');
  const resolved = { ...env, PAYPAL_SANDBOX_PROFILE: profile };
  if (profile === 'jp') {
    for (const suffix of ['CLIENT_ID', 'CLIENT_SECRET', 'WEBHOOK_ID', 'PRO_PLAN_ID', 'FAMILY_PLAN_ID']) {
      resolved['PAYPAL_SANDBOX_' + suffix] = env['PAYPAL_JP_SANDBOX_' + suffix];
    }
  }
  return resolved;
}
export function configuration(env) {
  const names = ['PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET', 'PAYPAL_SANDBOX_WEBHOOK_ID', 'PAYPAL_SANDBOX_PRO_PLAN_ID', 'PAYPAL_SANDBOX_FAMILY_PLAN_ID', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  if (env.PAYPAL_BILLING_MODE !== 'sandbox' || names.some(name => !env[name])) fail(503, 'Checkout de teste ainda nao configurado.');
  return { pro: env.PAYPAL_SANDBOX_PRO_PLAN_ID, family: env.PAYPAL_SANDBOX_FAMILY_PLAN_ID, merchantProfile: env.PAYPAL_SANDBOX_PROFILE || 'legacy' };
}
export async function http(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Object.assign(new Error('Nao foi possivel confirmar a operacao no provedor.'), { status: 424, providerStatus: response.status });
  return response.json();
}
export async function database(env, name, args) {
  if (env.PAYPAL_SANDBOX_PROFILE === 'jp' && ['paypal_sandbox_reserve', 'paypal_sandbox_customer_status'].includes(name)) {
    name += '_profile';
    args = { ...args, target_profile: 'jp' };
  }
  return http(env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/' + name, {
    method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args)
  }).catch(error => fail(424, 'Consulta de pagamentos indisponivel no banco' + (error.providerStatus ? ' (HTTP ' + error.providerStatus + ')' : '') + '.'));
}
export async function paypal(env) {
  const auth = await http(API + '/v1/oauth2/token', { method: 'POST', headers: { Authorization: 'Basic ' + btoa(env.PAYPAL_SANDBOX_CLIENT_ID + ':' + env.PAYPAL_SANDBOX_CLIENT_SECRET), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!auth.access_token) fail(502, 'PayPal indisponivel.');
  return (path, body, id) => http(API + path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + auth.access_token, 'Content-Type': 'application/json', ...(id ? { 'PayPal-Request-Id': id } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
export async function customer(request, env, { admin = false } = {}) {
  const origin = new URL(request.url).origin;
  const allowed = admin ? ['https://nekumafinance.app', 'https://admin.nekumafinance.app'] : ['https://nekumafinance.app', 'https://app.nekumafinance.app'];
  if (!allowed.includes(origin) || request.headers.get('Origin') !== origin) fail(403, 'Origem nao autorizada.');
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) fail(401, 'Entre na sua conta.');
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) fail(503, 'Autenticacao indisponivel.');
  const headers = { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization };
  const user = await http(env.SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user', { headers }).catch(error => fail(error.providerStatus === 401 || error.providerStatus === 403 ? 401 : 503, error.providerStatus === 401 || error.providerStatus === 403 ? 'Sessao expirada. Entre novamente.' : 'Validacao da sessao indisponivel.'));
  const access = await http(env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/my_commercial_access', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' }).catch(error => fail(error.providerStatus === 403 ? 403 : 503, 'Nao foi possivel validar o acesso desta conta.'));
  if (!user.id || access.blocked || !access.enforcementActive) fail(403, 'Conta indisponivel para contratacao.');
  if (admin) {
    // This database RPC requires both commercial_admins membership and AAL2.
    await http(env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/commercial_admin_overview', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' }).catch(() => fail(403, 'Acesso ADMIN com 2FA obrigatorio.'));
    return user;
  }
  // Sandbox is intentionally limited to explicitly authorized test accounts.
  if (!String(env.PAYPAL_SANDBOX_TEST_USERS || '').split(',').map(s => s.trim()).includes(user.id)) fail(403, 'Checkout disponivel apenas para contas de teste autorizadas.');
  return user;
}
export function validateBinding(sub, binding, plans) {
  if ((binding?.merchant_profile || 'legacy') !== (plans.merchantProfile || 'legacy')) fail(400, 'Conta vendedora divergente.');
  if (!['pro', 'family'].includes(binding?.plan) || sub.id !== binding.subscription_id || sub.custom_id !== binding.id || sub.plan_id !== plans[binding.plan] || sub.plan_overridden === true || (sub.quantity && Number(sub.quantity) !== 1) || Number(sub.shipping_amount?.value || 0) !== 0) fail(400, 'Vinculo divergente.');
}
export function validatePlan(plan, key) {
  const cycle = plan.billing_cycles;
  if (plan.status !== 'ACTIVE' || !Array.isArray(cycle) || cycle.length !== 1 || cycle[0].tenure_type !== 'REGULAR' || cycle[0].frequency?.interval_unit !== 'MONTH' || cycle[0].frequency?.interval_count !== 1 || cycle[0].total_cycles !== 0 || cycle[0].pricing_scheme?.fixed_price?.currency_code !== 'JPY' || Number(cycle[0].pricing_scheme.fixed_price.value) !== (key === 'pro' ? 480 : 850) || Number(plan.payment_preferences?.setup_fee?.value || 0) !== 0 || Number(plan.taxes?.percentage || 0) !== 0 || plan.quantity_supported) fail(503, 'Configuracao do plano PayPal divergente.');
}
export function confirmedSandboxPeriod(subscription, transaction, plan) {
  const expected = plan === 'pro' ? 480 : plan === 'family' ? 850 : NaN;
  const gross = transaction?.amount_with_breakdown?.gross_amount;
  const last = subscription.billing_info?.last_payment;
  const from = Date.parse(transaction?.time);
  const until = Date.parse(subscription.billing_info?.next_billing_time);
  // Do not invent a paid month from approval, receipt count or an estimated date.
  if (transaction?.status !== 'COMPLETED' || !transaction.id || gross?.currency_code !== 'JPY' || Number(gross.value) !== expected
    || last?.amount?.currency_code !== 'JPY' || Number(last.amount.value) !== expected
    || !Number.isFinite(from) || from > Date.now() + 300000 || from !== Date.parse(last.time)
    || !Number.isFinite(until) || until <= from || until - from > 32 * 86400000) return null;
  return { payment: transaction.id, from: new Date(from).toISOString(), until: new Date(until).toISOString() };
}
export async function storeSandboxPeriod(env, binding, subscription, transaction) {
  if (env.PAYPAL_SANDBOX_LEDGER_ENABLED !== 'true') return;
  const period = confirmedSandboxPeriod(subscription, transaction, binding.plan);
  if (!period) return;
  await database(env, 'paypal_sandbox_confirm_period', {
    target_checkout: binding.id, target_profile: binding.merchant_profile || 'legacy',
    target_payment: period.payment, period_start: period.from, period_end: period.until
  });
}
export async function syncSandboxAccessState(env, binding, subscription) {
  if (env.PAYPAL_SANDBOX_ACCESS_ENABLED !== 'true') return;
  const updated = Date.parse(subscription.update_time);
  if (!Number.isFinite(updated)) fail(502, 'Data de atualizacao da assinatura ausente.');
  await database(env, 'paypal_sandbox_sync_state', {
    target_checkout: binding.id, target_profile: binding.merchant_profile || 'legacy',
    target_status: subscription.status, target_updated_at: new Date(updated).toISOString()
  });
}
export async function sandboxEntitlement(env, binding, subscription, api) {
  if (env.PAYPAL_SANDBOX_LEDGER_ENABLED !== 'true') return null;
  const stamp = Date.parse(subscription.billing_info?.last_payment?.time);
  if (Number.isFinite(stamp) && stamp <= Date.now() && stamp >= Date.now() - 40 * 86400000) {
    const query = new URLSearchParams({ start_time: new Date(stamp - 86400000).toISOString(), end_time: new Date().toISOString() });
    const list = await api('/v1/billing/subscriptions/' + encodeURIComponent(binding.subscription_id) + '/transactions?' + query);
    for (const item of list.transactions || []) {
      if (['REFUNDED', 'PARTIALLY_REFUNDED', 'REVERSED'].includes(item.status) && /^[A-Za-z0-9-]{1,200}$/.test(item.id || '')) {
        await database(env, 'paypal_sandbox_hold_payment', { target_profile: binding.merchant_profile || 'legacy', target_payment: item.id,
          target_event: ('reconcile:' + item.id).slice(0, 200), target_reason: item.status === 'REVERSED' ? 'PAYMENT.SALE.REVERSED' : 'PAYMENT.SALE.REFUNDED' });
      }
    }
    // A bounded reconciliation also recovers an already paid checkout after rollout.
    if (!list.links?.some(link => link.rel === 'next') && !(Number(list.total_pages) > 1)) {
      const matches = list.transactions?.filter(item => confirmedSandboxPeriod(subscription, item, binding.plan)) || [];
      if (matches.length === 1) await storeSandboxPeriod(env, binding, subscription, matches[0]);
    }
  }
  const result = await database(env, 'paypal_sandbox_entitlement', { target_checkout: binding.id, target_profile: binding.merchant_profile || 'legacy' });
  if (!['ACTIVE', 'CANCELLED'].includes(subscription.status)) return { active: false, plan: 'free', paidUntil: result.paidUntil, reason: 'provider_not_active' };
  return { active: result.active === true, plan: result.active === true ? binding.plan : 'free', paidUntil: result.paidUntil || null, reason: result.reason, renewalExpected: subscription.status === 'ACTIVE' };
}
export function canRestartSandboxCheckout(env, subscription, simulation) {
  if (env.PAYPAL_SANDBOX_LEDGER_ENABLED !== 'true' || env.PAYPAL_SANDBOX_ACCESS_ENABLED !== 'true'
    || !['CANCELLED', 'EXPIRED'].includes(subscription.status) || simulation?.active !== false) return false;
  if (simulation.reason === 'payment_review') return true;
  const last = subscription.billing_info?.last_payment;
  if (!last) return true;
  const stamp = Date.parse(last.time);
  return Number.isFinite(stamp) && stamp < Date.now() - 32 * 86400000;
}
export async function boundedJson(request, limit = 65536) {
  const reader = request.body?.getReader();
  if (!reader) fail(400, 'Corpo ausente.');
  let size = 0; const chunks = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); fail(413, 'Corpo muito grande.'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { fail(400, 'JSON invalido.'); }
}
