import { stripe, stripeConfiguration, validateSession, fail } from './stripe-billing.js';
import { database } from './paypal-billing.js';
import { clockTime } from './stripe-cycles.js';

const supported = new Set(['checkout.session.completed','invoice.paid','invoice.payment_failed',
  'customer.subscription.updated','customer.subscription.deleted','charge.refunded',
  'charge.dispute.created','charge.dispute.updated','charge.dispute.closed']);
const id = (value, prefix) => {
  const result = typeof value === 'string' ? value : value?.id;
  const pattern = prefix === 'cs' ? /^cs_test_[A-Za-z0-9]+$/ : new RegExp('^' + prefix + '_[A-Za-z0-9]+$');
  if (!pattern.test(result || '')) fail(503, 'Identificador Stripe ausente.');
  return result;
};

export async function verifiedStripeEvent(request, env) {
  stripeConfiguration(env);
  const secret = String(env.STRIPE_TEST_WEBHOOK_SECRET || '').trim();
  if (!/^whsec_[A-Za-z0-9_]+$/.test(secret)) fail(503, 'Webhook Stripe de teste ainda nao configurado.');
  const fields = (request.headers.get('Stripe-Signature') || '').split(',').map(part => part.trim().split('='));
  const timestamps = fields.filter(([key]) => key === 't');
  const timestamp = timestamps[0]?.[1];
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamp || '') || Math.abs(Date.now()/1000 - Number(timestamp)) > 300) fail(400, 'Assinatura Stripe invalida.');
  const reader = request.body?.getReader();
  if (!reader) fail(400, 'Corpo ausente.');
  const chunks = []; let length = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.length;
    if (length > 262144) { await reader.cancel(); fail(413, 'Evento muito grande.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  let valid = false;
  for (const [kind, value] of fields) {
    if (kind !== 'v1' || !/^[a-f0-9]{64}$/.test(value || '')) continue;
    const signature = Uint8Array.from(value.match(/../g), pair => parseInt(pair,16));
    if (await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(timestamp + '.' + raw))) valid = true;
  }
  if (!valid) fail(400, 'Assinatura Stripe invalida.');
  let event;
  try { event = JSON.parse(raw); } catch { fail(400, 'Evento invalido.'); }
  id(event.id, 'evt');
  if (event.livemode !== false || event.account) fail(400, 'Evento fora do ambiente autorizado.');
  return event;
}

export async function processStripeTestEvent(env, incoming) {
  if (!supported.has(incoming.type)) return { ignored: true };
  // Resolve the signed event and all payment objects through this account's test key.
  const event = await stripe(env, 'events/' + id(incoming.id, 'evt'));
  if (event.id !== incoming.id || event.type !== incoming.type || event.account) fail(400, 'Evento divergente.');
  const object = event.data?.object;
  let subscription, invoice, charge, session;
  if (event.type.startsWith('checkout.')) {
    session = await stripe(env, 'checkout/sessions/' + id(object?.id, 'cs'));
    subscription = await stripe(env, 'subscriptions/' + id(session.subscription, 'sub'));
  } else if (event.type.startsWith('customer.subscription.')) {
    subscription = await stripe(env, 'subscriptions/' + id(object?.id, 'sub'));
  } else if (event.type.startsWith('invoice.')) {
    invoice = await stripe(env, 'invoices/' + id(object?.id, 'in'));
    subscription = await stripe(env, 'subscriptions/' + id(invoice.subscription, 'sub'));
  } else {
    if (event.type.startsWith('charge.dispute.')) {
      const dispute = await stripe(env, 'disputes/' + id(object?.id, 'dp'));
      charge = await stripe(env, 'charges/' + id(dispute.charge, 'ch'));
    } else charge = await stripe(env, 'charges/' + id(object?.id, 'ch'));
    invoice = await stripe(env, 'invoices/' + id(charge.invoice, 'in'));
    subscription = await stripe(env, 'subscriptions/' + id(invoice.subscription, 'sub'));
  }
  const user = subscription.metadata?.nekuma_user;
  if (!String(env.STRIPE_TEST_USERS || '').split(',').map(v=>v.trim()).includes(user)) return { ignored: true };
  const binding = await database(env, 'stripe_test_lookup_subscription', { target_user: user, target_subscription: subscription.id });
  if (!binding?.session_id) fail(503, 'Vinculo Stripe ainda nao disponivel.');
  session ||= await stripe(env, 'checkout/sessions/' + id(binding.session_id, 'cs'));
  validateSession(session, { id: user });
  if (session.id !== binding.session_id || id(session.subscription,'sub') !== subscription.id
    || subscription.metadata?.nekuma_plan !== 'pro' || subscription.customer !== session.customer
    || (binding.customer_id && binding.customer_id !== session.customer)
    || (binding.subscription_id && binding.subscription_id !== subscription.id)) fail(400, 'Vinculo da assinatura divergente.');
  const effect = { action: 'state' };
  const now = await clockTime(env, binding, subscription);
  if (event.type === 'invoice.paid') {
    charge ||= await stripe(env, 'charges/' + id(invoice.charge, 'ch'));
    const line = invoice.lines?.data?.[0];
    const price = line?.price;
    const from = line?.period?.start, until = line?.period?.end;
    if (invoice.status !== 'paid' || invoice.paid !== true || invoice.amount_paid !== 480 || invoice.total !== 480
      || invoice.currency !== 'jpy' || invoice.customer !== session.customer || invoice.collection_method !== 'charge_automatically'
      || !['subscription_create','subscription_cycle'].includes(invoice.billing_reason)
      || invoice.lines?.has_more || invoice.lines?.data?.length !== 1 || line.quantity !== 1 || line.proration
      || price?.currency !== 'jpy' || price.unit_amount !== 480 || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1
      || !Number.isInteger(from) || !Number.isInteger(until) || until <= from || until-from > 32*86400 || from*1000 > now+300000
      || charge.status !== 'succeeded' || !charge.paid || charge.amount !== 480 || charge.currency !== 'jpy'
      || id(charge.invoice,'in') !== invoice.id || charge.customer !== session.customer) fail(400, 'Pagamento Stripe divergente.');
    if (charge.amount_refunded > 0 || charge.refunded || charge.disputed) {
      Object.assign(effect, { action: 'hold', charge: charge.id, reason: charge.disputed ? 'dispute' : 'refund' });
    } else Object.assign(effect, { action: 'paid', invoice: invoice.id, charge: charge.id,
      from: new Date(from*1000).toISOString(), until: new Date(until*1000).toISOString() });
  } else if (event.type === 'charge.refunded' || event.type.startsWith('charge.dispute.')) {
    if (id(charge.invoice,'in') !== invoice.id || charge.customer !== session.customer || charge.currency !== 'jpy' || charge.amount !== 480) fail(400, 'Pagamento divergente.');
    if (event.type === 'charge.refunded' && !(charge.amount_refunded > 0 || charge.refunded)) fail(503, 'Reembolso ainda nao confirmado.');
    // Dispute closure never clears a refund hold; all resolutions require review.
    Object.assign(effect, { action: 'hold', charge: charge.id, reason: event.type === 'charge.refunded' ? 'refund' : 'dispute' });
  }
  await database(env, 'stripe_test_record', { target_checkout: binding.id, target_event: event.id,
    target_kind: event.type, target_subscription: subscription.id, effect });
  return { received: true };
}
