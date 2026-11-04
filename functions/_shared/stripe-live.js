import { fail, http } from './paypal-billing.js';

export function liveConfiguration(env) {
  if (env.STRIPE_LIVE_ENABLED !== 'true') fail(503, 'Contratacao comercial ainda indisponivel.');
  const key = String(env.STRIPE_LIVE_SECRET_KEY || '').trim();
  const price = String(env.STRIPE_LIVE_PRO_PRICE_ID || '').trim();
  const account = String(env.STRIPE_LIVE_ACCOUNT_ID || '').trim();
  if (!/^(?:sk|rk)_live_[A-Za-z0-9_]+$/.test(key)
    || !/^price_[A-Za-z0-9]+$/.test(price)
    || !/^acct_[A-Za-z0-9]+$/.test(account)) fail(503, 'Configuracao Stripe LIVE incompleta.');
  return { key, price, account };
}

export async function liveStripe(env, path, parameters, idempotencyKey) {
  const config = liveConfiguration(env);
  if (!/^[A-Za-z0-9_/?=&%-]+$/.test(path) || path.startsWith('/')) fail(500, 'Consulta Stripe invalida.');
  if (parameters && !idempotencyKey) fail(500, 'Chave de idempotencia obrigatoria.');
  const response = await fetch('https://api.stripe.com/v1/' + path, {
    method: parameters ? 'POST' : 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: 'Bearer ' + config.key, 'Stripe-Version': '2024-06-20',
      ...(parameters ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idempotencyKey } : {})
    },
    ...(parameters ? { body: new URLSearchParams(parameters).toString() } : {})
  });
  if (!response.ok) fail(503, 'Nao foi possivel confirmar a operacao na Stripe.');
  let result;
  try { result = await response.json(); } catch { fail(502, 'Resposta Stripe invalida.'); }
  if (path === 'account') {
    if (result.id !== config.account || result.charges_enabled !== true || result.payouts_enabled !== true)
      fail(503, 'Conta Stripe LIVE nao liberada para vendas.');
  } else if (result.livemode !== true) fail(502, 'Resposta fora do ambiente LIVE.');
  return result;
}

export async function verifyLiveCatalog(env) {
  const { price: expected } = liveConfiguration(env);
  await liveStripe(env, 'account');
  const price = await liveStripe(env, 'prices/' + expected);
  if (price.id !== expected || price.active !== true || price.type !== 'recurring'
    || price.currency !== 'jpy' || price.unit_amount !== 480 || price.billing_scheme !== 'per_unit'
    || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1
    || price.recurring.usage_type !== 'licensed' || price.recurring.trial_period_days
    || price.transform_quantity || price.custom_unit_amount)
    fail(503, 'Preco PRO LIVE divergente do plano JPY 480 mensal.');
  return price;
}

export async function liveCustomer(request, env) {
  liveConfiguration(env);
  const origin = new URL(request.url).origin;
  if (!['https://nekumafinance.app', 'https://app.nekumafinance.app'].includes(origin)
    || request.headers.get('Origin') !== origin) fail(403, 'Origem nao autorizada.');
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) fail(401, 'Entre na sua conta.');
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) fail(503, 'Autenticacao indisponivel.');
  const headers = { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization };
  const user = await http(env.SUPABASE_URL + '/auth/v1/user', { headers });
  const access = await http(env.SUPABASE_URL + '/rest/v1/rpc/my_commercial_access', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}'
  });
  if (!user.id || access.blocked || access.enforcementActive !== true) fail(403, 'Conta indisponivel para contratacao.');
  // The first real transaction remains restricted until a separate public rollout.
  if (env.STRIPE_LIVE_PUBLIC !== 'true' && !String(env.STRIPE_LIVE_USERS || '').split(',').map(v => v.trim()).includes(user.id))
    fail(403, 'Contratacao em validacao final.');
  return user;
}

export function validateLiveSession(session, user) {
  if (!/^cs_live_[A-Za-z0-9]+$/.test(session.id || '') || session.livemode !== true
    || session.client_reference_id !== user.id || session.mode !== 'subscription'
    || session.currency !== 'jpy' || session.amount_total !== 480
    || session.metadata?.nekuma_user !== user.id || session.metadata?.nekuma_plan !== 'pro')
    fail(403, 'Checkout LIVE divergente.');
}
