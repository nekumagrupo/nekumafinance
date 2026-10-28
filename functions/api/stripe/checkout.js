import { stripeCustomer, stripe, validateSession, fail, reply } from '../../_shared/stripe-billing.js';
import { boundedJson, database } from '../../_shared/paypal-billing.js';
import { prepareClock, canRestart, clockTime } from '../../_shared/stripe-cycles.js';

export async function onRequestPost({ request, env }) {
  try {
    const user = await stripeCustomer(request, env);
    const body = await boundedJson(request, 1024);
    if (body.plan !== 'pro') fail(400, 'Somente PRO disponivel para teste.');
    let reservation = await database(env, 'stripe_test_reserve', { target_user: user.id });
    if (!reservation?.id || reservation.user_id !== user.id || reservation.plan !== 'pro') fail(503, 'Reserva indisponivel.');
    if (body.restart === true && reservation.session_id) {
      const previous = await stripe(env, 'checkout/sessions/' + encodeURIComponent(reservation.session_id));
      validateSession(previous, user);
      if (reservation.clock_id) await clockTime(env, reservation);
      const simulation = await database(env, 'stripe_test_entitlement', { target_user: user.id });
      if (!simulation || !await canRestart(env, reservation, previous, simulation)) fail(409, 'Encerre a renovacao e o periodo pago antes de iniciar outro ciclo.');
      reservation = await database(env, 'stripe_test_restart', { target_user: user.id, target_checkout: reservation.id });
      if (!reservation?.id || reservation.user_id !== user.id || reservation.plan !== 'pro') fail(503, 'Novo ciclo indisponivel.');
    }
    if (body.useClock === true) reservation = await prepareClock(env, reservation);
    const created = Date.parse(reservation.created_at);
    if (!Number.isFinite(created) || created > Date.now() + 300000) fail(503, 'Data da reserva invalida.');
    if (!reservation.session_id && Date.now() - created > 23 * 3600000) fail(409, 'Tentativa antiga requer revisao antes de recriar checkout.');
    const session = reservation.session_id
      ? await stripe(env, 'checkout/sessions/' + encodeURIComponent(reservation.session_id))
      : await stripe(env, 'checkout/sessions', {
      mode: 'subscription', 'payment_method_types[0]': 'card',
      ...(reservation.customer_id ? { customer: reservation.customer_id } : {}),
      client_reference_id: user.id,
      'metadata[nekuma_user]': user.id, 'metadata[nekuma_plan]': 'pro',
      'subscription_data[metadata][nekuma_user]': user.id,
      'subscription_data[metadata][nekuma_plan]': 'pro',
      'line_items[0][price_data][currency]': 'jpy',
      'line_items[0][price_data][unit_amount]': '480',
      'line_items[0][price_data][recurring][interval]': 'month',
      'line_items[0][price_data][product_data][name]': 'Nekuma PRO - TESTE',
      'line_items[0][quantity]': '1',
      success_url: 'https://app.nekumafinance.app/app?tab=plans&stripe_test=return&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://app.nekumafinance.app/app?tab=plans&stripe_test=cancel'
    }, 'nekuma-stripe-test-' + reservation.id);
    validateSession(session, user);
    if (session.status !== 'open') fail(409, 'Checkout encerrado. Consulte o resultado do teste.');
    const url = new URL(session.url);
    if (url.origin !== 'https://checkout.stripe.com' || url.username || url.password) fail(502, 'Destino invalido.');
    await database(env, 'stripe_test_bind', { target_checkout: reservation.id, target_session: session.id });
    return reply({ approvalUrl: url.href, sessionId: session.id, environment: 'test', grantsAccess: false });
  } catch (error) {
    return reply({ error: error.status ? error.message : 'Checkout de teste indisponivel.' }, error.status || 503);
  }
}
