import { reply, fail, configuration, customer, paypal, database, validatePlan, validateBinding, boundedJson, billingEnvironment } from '../../_shared/paypal-billing.js';

export async function onRequestPost({ request, env }) {
  try {
    env = billingEnvironment(env);
    const plans = configuration(env);
    const user = await customer(request, env);
    const body = await boundedJson(request, 1024);
    if (!['pro', 'family'].includes(body.plan)) fail(400, 'Plano invalido.');
    const api = await paypal(env);
    validatePlan(await api('/v1/billing/plans/' + encodeURIComponent(plans[body.plan])), body.plan);
    const reservation = await database(env, 'paypal_sandbox_reserve', { target_user: user.id, target_plan: body.plan });
    if (reservation.plan !== body.plan) fail(409, 'Ja existe um checkout de outro plano. Finalize a verificacao antes de tentar novamente.');
    if (Date.now() - Date.parse(reservation.created_at) > 48 * 3600000) fail(409, 'Checkout antigo requer revisao pelo suporte antes de uma nova assinatura.');
    // Resume a bound subscription by GET: never repeat creation after approval attempts.
    const subscription = reservation.subscription_id
      ? await api('/v1/billing/subscriptions/' + encodeURIComponent(reservation.subscription_id))
      : await api('/v1/billing/subscriptions', {
      plan_id: plans[body.plan], custom_id: reservation.id,
      application_context: { brand_name: 'Nekuma Finance (Sandbox)', shipping_preference: 'NO_SHIPPING', user_action: 'SUBSCRIBE_NOW', return_url: 'https://app.nekumafinance.app/app?tab=plans&payment=return', cancel_url: 'https://app.nekumafinance.app/app?tab=plans&payment=cancel' }
    }, reservation.id);
    if (reservation.subscription_id) validateBinding(subscription, reservation, plans);
    if (subscription.status !== 'APPROVAL_PENDING') fail(409, 'Esta assinatura nao aguarda aprovacao. Consulte o status antes de continuar.');
    if (!/^I-[A-Z0-9]+$/.test(subscription.id || '')) fail(502, 'Assinatura invalida.');
    const approval = subscription.links?.find(link => link.rel === 'approve')?.href;
    const url = new URL(approval);
    if (url.origin !== 'https://www.sandbox.paypal.com' || url.username || url.password) fail(502, 'Destino de pagamento invalido.');
    await database(env, 'paypal_sandbox_bind', { checkout_id: reservation.id, subscription: subscription.id });
    return reply({ approvalUrl: url.href, environment: 'sandbox' });
  } catch (error) { return reply({ error: error.status ? error.message : 'Checkout indisponivel.' }, error.status || 503); }
}
