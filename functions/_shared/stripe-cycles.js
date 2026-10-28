import { stripe, validateSession, fail } from './stripe-billing.js';
import { database } from './paypal-billing.js';

export async function clockTime(env, binding, subscription) {
  if (!binding.clock_id) {
    if (subscription?.test_clock) fail(400, 'Relogio Stripe nao vinculado.');
    return Date.now();
  }
  if (subscription && subscription.test_clock !== binding.clock_id) fail(400, 'Relogio Stripe divergente.');
  const clock = await stripe(env, 'test_helpers/test_clocks/' + encodeURIComponent(binding.clock_id));
  if (clock.id !== binding.clock_id || clock.status !== 'ready' || !Number.isSafeInteger(clock.frozen_time)) fail(503, 'Aguarde o relogio Stripe concluir o avanco.');
  const instant = new Date(clock.frozen_time * 1000);
  if (!Number.isFinite(instant.getTime())) fail(503, 'Hora Stripe invalida.');
  await database(env, 'stripe_test_clock_bind', { target_checkout: binding.id, target_clock: clock.id,
    target_customer: binding.customer_id, target_time: instant.toISOString() });
  return instant.getTime();
}

export async function canRestart(env, reservation, session, simulation) {
  if (simulation?.active) return false;
  if (session.status === 'expired') return true;
  if (session.status !== 'complete' || !/^sub_[A-Za-z0-9]+$/.test(session.subscription || '')) return false;
  const sub = await stripe(env, 'subscriptions/' + session.subscription);
  validateSession(session, { id: reservation.user_id });
  if (sub.id !== session.subscription || sub.customer !== session.customer || sub.metadata?.nekuma_user !== reservation.user_id
    || sub.metadata?.nekuma_plan !== 'pro') fail(403, 'Assinatura divergente.');
  return sub.status === 'canceled' || sub.cancel_at_period_end === true;
}

export async function prepareClock(env, reservation) {
  if (reservation.clock_id) return reservation;
  if (reservation.session_id) fail(409, 'O relogio exige um novo ciclo de teste.');
  const created = Math.floor(Date.parse(reservation.created_at) / 1000);
  if (!Number.isSafeInteger(created) || Date.now() - created * 1000 > 23 * 3600000) fail(409, 'Reserva antiga requer revisao.');
  const clock = await stripe(env, 'test_helpers/test_clocks', { frozen_time: String(created), name: 'Nekuma TEST ' + reservation.id }, 'nekuma-clock-' + reservation.id);
  if (!/^clock_[A-Za-z0-9]+$/.test(clock.id || '') || clock.frozen_time !== created || clock.status !== 'ready') fail(503, 'Relogio de teste invalido.');
  const customer = await stripe(env, 'customers', { test_clock: clock.id,
    'metadata[nekuma_user]': reservation.user_id, 'metadata[nekuma_cycle]': reservation.id }, 'nekuma-clock-customer-' + reservation.id);
  if (!/^cus_[A-Za-z0-9]+$/.test(customer.id || '') || customer.test_clock !== clock.id) fail(503, 'Cliente de teste divergente.');
  await database(env, 'stripe_test_clock_bind', { target_checkout: reservation.id, target_clock: clock.id,
    target_customer: customer.id, target_time: new Date(created * 1000).toISOString() });
  return { ...reservation, clock_id: clock.id, customer_id: customer.id };
}
