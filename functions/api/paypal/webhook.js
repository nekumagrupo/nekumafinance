import { reply, fail, configuration, paypal, database, boundedJson, validateBinding } from '../../_shared/paypal-billing.js';

export async function onRequestPost({ request, env }) {
  try {
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
      // Refund/reversal events are queued for review; this Sandbox never grants real access.
      await database(env, 'paypal_sandbox_review', { event_key: event.id, event_kind: String(event.event_type || '').slice(0, 100) });
      return reply({ received: true, review: true });
    }
    const id = sale ? event.resource?.billing_agreement_id : event.resource?.id;
    if (!/^I-[A-Z0-9]+$/.test(id || '')) fail(400, 'Assinatura ausente.');
    const binding = await database(env, 'paypal_sandbox_lookup', { subscription: id });
    if (!binding) fail(503, 'Aguardando vinculo do checkout.');
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
      if (!confirmed || amount?.currency_code !== 'JPY' || Number(amount.value) !== (binding.plan === 'pro' ? 480 : 850)) fail(400, 'Pagamento nao confirmado.');
      payment = confirmed.id;
    }
    await database(env, 'paypal_sandbox_record', { checkout_id: binding.id, event_key: event.id, event_kind: event.event_type, provider_status: sub.status, payment_id: payment });
    return reply({ received: true, environment: 'sandbox' });
  } catch (error) { return reply({ error: error.status ? error.message : 'Webhook temporariamente indisponivel.' }, error.status || 503); }
}
