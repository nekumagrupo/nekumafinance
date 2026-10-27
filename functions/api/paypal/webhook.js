import { reply, fail, configuration, paypal, database, boundedJson, validateBinding, billingEnvironment, storeSandboxPeriod, syncSandboxAccessState } from '../../_shared/paypal-billing.js';

export async function onRequestPost({ request, env }) {
  return handleWebhook({ request, env }, 'legacy');
}

export async function handleWebhook({ request, env }, profile) {
  try {
    env = billingEnvironment(env, profile);
    const plans = configuration(env);
    const event = await boundedJson(request);
    if (!event.id || typeof event.id !== 'string' || event.id.length > 200) fail(400, 'Evento invalido.');
    const verification = { webhook_id: env.PAYPAL_SANDBOX_WEBHOOK_ID, webhook_event: event };
    for (const [field, header] of Object.entries({ auth_algo: 'paypal-auth-algo', cert_url: 'paypal-cert-url', transmission_id: 'paypal-transmission-id', transmission_sig: 'paypal-transmission-sig', transmission_time: 'paypal-transmission-time' })) {
      verification[field] = request.headers.get(header);
      if (!verification[field]) fail(400, 'Assinatura ausente.');
    }
    const cert = new URL(verification.cert_url);
    if (cert.origin !== 'https://api.sandbox.paypal.com' || !cert.pathname.startsWith('/v1/notifications/certs/') || cert.username || cert.password) fail(400, 'Certificado invalido.');
    const api = await paypal(env);
    if ((await api('/v1/notifications/verify-webhook-signature', verification)).verification_status !== 'SUCCESS') fail(401, 'Assinatura invalida.');
    const sale = event.event_type === 'PAYMENT.SALE.COMPLETED';
    const subscriptionEvent = String(event.event_type || '').startsWith('BILLING.SUBSCRIPTION.');
    if (!sale && !subscriptionEvent) {
      if (env.PAYPAL_SANDBOX_LEDGER_ENABLED === 'true' && ['PAYMENT.SALE.REFUNDED', 'PAYMENT.SALE.REVERSED'].includes(event.event_type)) {
        const paymentId = event.event_type === 'PAYMENT.SALE.REFUNDED' ? event.resource?.sale_id : event.resource?.id;
        if (typeof paymentId !== 'string' || !/^[A-Za-z0-9-]{1,200}$/.test(paymentId)) fail(400, 'Referencia de pagamento ausente.');
        await database(env, 'paypal_sandbox_hold_payment', { target_profile: plans.merchantProfile, target_payment: paymentId, target_event: event.id, target_reason: event.event_type });
      }
      // Signed refunds/partial refunds/reversals require review; replays never clear holds.
      await database(env, 'paypal_sandbox_review', { event_key: event.id, event_kind: String(event.event_type || '').slice(0, 100) });
      return reply({ received: true, review: true });
    }
    const id = sale ? event.resource?.billing_agreement_id : event.resource?.id;
    if (!/^I-[A-Z0-9]+$/.test(id || '')) fail(400, 'Assinatura ausente.');
    const binding = await database(env, 'paypal_sandbox_lookup', { subscription: id });
    if (!binding) fail(503, 'Aguardando vinculo do checkout.');
    if ((binding.merchant_profile || 'legacy') !== plans.merchantProfile) fail(400, 'Conta vendedora divergente.');
    const sub = await api('/v1/billing/subscriptions/' + encodeURIComponent(id));
    validateBinding(sub, binding, plans);
    let payment = null;
    if (sale) {
      const stamp = Date.parse(event.resource?.create_time);
      if (!Number.isFinite(stamp) || stamp > Date.now() + 300000) fail(400, 'Data invalida.');
      const query = new URLSearchParams({ start_time: new Date(stamp - 86400000).toISOString(), end_time: new Date(Math.min(Date.now(), stamp + 86400000)).toISOString() });
      const transactions = await api('/v1/billing/subscriptions/' + encodeURIComponent(id) + '/transactions?' + query);
      const confirmed = transactions.transactions?.find(item => item.id === event.resource.id && item.status === 'COMPLETED');
      const amount = confirmed?.amount_with_breakdown?.gross_amount;
      // The signed notification can arrive before the transaction query is consistent.
      if (!confirmed) fail(503, 'Pagamento aguardando confirmacao no provedor.');
      if (amount?.currency_code !== 'JPY' || Number(amount.value) !== (binding.plan === 'pro' ? 480 : 850)) fail(400, 'Valor do pagamento divergente.');
      payment = confirmed.id;
      await storeSandboxPeriod(env, binding, sub, confirmed);
    }
    await database(env, 'paypal_sandbox_record', { checkout_id: binding.id, event_key: event.id, event_kind: event.event_type, provider_status: sub.status, payment_id: payment });
    await syncSandboxAccessState(env, binding, sub);
    return reply({ received: true, environment: 'sandbox' });
  } catch (error) { return reply({ error: error.status ? error.message : 'Webhook temporariamente indisponivel.' }, error.status || 503); }
}
