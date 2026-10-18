import { reply, fail, configuration, customer, database, paypal, validateBinding } from '../../_shared/paypal-billing.js';

// POST keeps the same-origin/CSRF policy as checkout; the body never selects a user.
export async function onRequestPost({ request, env }) {
  try {
    const user = await customer(request, env);
    let plans;
    try { plans = configuration(env); } catch { return reply({ available: false, environment: 'sandbox', status: 'not_configured' }); }
    const snapshot = await database(env, 'paypal_sandbox_customer_status', { target_user: user.id });
    if (!snapshot) return reply({ available: true, environment: 'sandbox', status: 'not_started', confirmedReceipts: 0 });
    let providerStatus = 'PENDING_BINDING';
    if (snapshot.subscription_id) {
      const api = await paypal(env);
      const subscription = await api('/v1/billing/subscriptions/' + encodeURIComponent(snapshot.subscription_id));
      validateBinding(subscription, snapshot, plans);
      if (!['APPROVAL_PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'].includes(subscription.status)) fail(502, 'Status desconhecido no provedor.');
      providerStatus = subscription.status;
    }
    return reply({ available: true, environment: 'sandbox', status: providerStatus, plan: snapshot.plan, confirmedReceipts: Number(snapshot.confirmed_receipts || 0), lastConfirmedAt: snapshot.last_confirmed_at || null, lastEventAt: snapshot.last_event_at || null });
  } catch (error) { return reply({ error: error.status ? error.message : 'Consulta de pagamento indisponivel.' }, error.status || 503); }
}
