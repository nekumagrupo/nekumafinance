import { stripeCustomer, stripe, validateSession, fail, reply } from '../../_shared/stripe-billing.js';
import { boundedJson, database } from '../../_shared/paypal-billing.js';

export async function onRequestPost({ request, env }) {
  try {
    const user = await stripeCustomer(request, env);
    const body = await boundedJson(request, 1024);
    const reservation = await database(env, 'stripe_test_reserve', { target_user: user.id });
    if (!reservation?.id || reservation.user_id !== user.id) fail(503, 'Reserva indisponivel.');
    if (!reservation.session_id) return reply({ environment: 'test', status: 'not_started', grantsAccess: false });
    if (body.sessionId && body.sessionId !== reservation.session_id) fail(403, 'Checkout divergente.');
    if (!/^cs_test_[A-Za-z0-9]+$/.test(reservation.session_id)) fail(503, 'Checkout invalido.');
    const session = await stripe(env, 'checkout/sessions/' + encodeURIComponent(reservation.session_id));
    validateSession(session, user);
    const simulation = env.STRIPE_TEST_ACCESS_ENABLED === 'true'
      ? await database(env, 'stripe_test_entitlement', { target_user: user.id }) : null;
    return reply({ environment: 'test', status: session.status, paymentStatus: session.payment_status, grantsAccess: false, simulation });
  } catch (error) {
    return reply({ error: error.status ? error.message : 'Consulta de teste indisponivel.' }, error.status || 503);
  }
}
