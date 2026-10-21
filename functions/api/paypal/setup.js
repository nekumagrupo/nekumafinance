import { reply, fail, customer, paypal, validatePlan, boundedJson, billingEnvironment } from '../../_shared/paypal-billing.js';

const PRODUCT = 'NEKUMA-FINANCE-SANDBOX-V1';
export async function onRequestPost({ request, env }) {
  try {
    env = billingEnvironment(env);
    await customer(request, env, { admin: true });
    const body = await boundedJson(request, 512);
    if (body.confirm !== 'CREATE_SANDBOX_CATALOG') fail(400, 'Confirme a preparacao do catalogo de testes.');
    if (env.PAYPAL_BILLING_MODE !== 'sandbox' || !env.PAYPAL_SANDBOX_CLIENT_ID || !env.PAYPAL_SANDBOX_CLIENT_SECRET) fail(503, 'Credenciais Sandbox ainda nao configuradas.');
    const api = await paypal(env);
    let product;
    try { product = await api('/v1/catalogs/products/' + PRODUCT); }
    catch (error) {
      if (error.providerStatus !== 404) throw error;
      product = await api('/v1/catalogs/products', { id: PRODUCT, name: 'Nekuma Finance Sandbox', description: 'Catalogo de testes. Sem cobrancas reais.', type: 'SERVICE', category: 'SOFTWARE', home_url: 'https://nekumafinance.app' }, 'nekuma-sandbox-product-v1');
    }
    if (product.id !== PRODUCT || (product.type && product.type !== 'SERVICE')) fail(409, 'Produto de teste divergente. Revise no PayPal.');
    const existing = [];
    for (let page = 1; page <= 5; page++) {
      const list = await api('/v1/billing/plans?product_id=' + PRODUCT + '&page_size=20&page=' + page + '&total_required=true');
      if (!Array.isArray(list.plans)) fail(502, 'Catalogo indisponivel.');
      existing.push(...list.plans);
      if (!list.links?.some(link => link.rel === 'next') && list.plans.length < 20) break;
      if (page === 5) fail(409, 'Catalogo extenso; revisao manual necessaria.');
    }
    const result = {};
    for (const [key, label, price] of [['pro', 'PRO', '480'], ['family', 'Familia', '850']]) {
      const name = 'Nekuma Finance ' + label + ' Sandbox v1';
      const candidates = existing.filter(plan => plan.name === name);
      if (candidates.length > 1) fail(409, 'Planos duplicados no PayPal. Revise antes de continuar.');
      let plan;
      if (candidates.length) plan = await api('/v1/billing/plans/' + encodeURIComponent(candidates[0].id));
      else plan = await api('/v1/billing/plans', { product_id: PRODUCT, name, status: 'ACTIVE', quantity_supported: false, billing_cycles: [{ frequency: { interval_unit: 'MONTH', interval_count: 1 }, tenure_type: 'REGULAR', sequence: 1, total_cycles: 0, pricing_scheme: { fixed_price: { value: price, currency_code: 'JPY' } } }], payment_preferences: { auto_bill_outstanding: false, setup_fee: { value: '0', currency_code: 'JPY' }, payment_failure_threshold: 1 } }, 'nekuma-sandbox-' + key + '-v1');
      if (!/^P-[A-Z0-9]+$/.test(plan.id || '')) fail(502, 'Plano retornado invalido.');
      // Create responses can be minimal; always verify the stored representation.
      plan = await api('/v1/billing/plans/' + encodeURIComponent(plan.id));
      if (plan.product_id !== PRODUCT) fail(502, 'Produto do plano divergente.');
      validatePlan(plan, key);
      result[key] = plan.id;
    }
    return reply({ environment: 'sandbox', merchantProfile: env.PAYPAL_SANDBOX_PROFILE, plans: result });
  } catch (error) { return reply({ error: error.status ? error.message : 'Preparacao Sandbox indisponivel.' }, error.status || 503); }
}
