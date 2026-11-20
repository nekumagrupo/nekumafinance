import { liveCustomer, liveStripe, verifyLiveCatalog, validateLiveSession, liveCheckoutOffer, expireSupersededValidation } from '../../_shared/stripe-live.js';
import { boundedJson, database, fail, reply } from '../../_shared/paypal-billing.js';

export async function onRequestPost({ request, env }) {
  try {
    const user = await liveCustomer(request, env);
    const body = await boundedJson(request, 1024);
    if (body.plan !== 'pro' || body.useClock || body.restart) fail(400, 'Somente assinatura PRO mensal disponivel.');
    const offer = liveCheckoutOffer(env, user);
    if (body.quotedAmount !== offer.amount) fail(409, 'Preco atualizado. Consulte seu pagamento antes de continuar.');
    const price = await verifyLiveCatalog(env, user);
    if (offer.validation) await expireSupersededValidation(env, user);
    const reservation = await database(env, 'stripe_live_reserve', { target_user: user.id });
    if (!reservation?.id || reservation.user_id !== user.id) fail(503, 'Reserva indisponivel.');
    if (reservation.subscription_id) fail(409, 'Voce ja possui uma assinatura. Gerencie a assinatura existente.');
    const created = Date.parse(reservation.created_at);
    if (!Number.isFinite(created) || created > Date.now() + 300000) fail(503, 'Reserva invalida.');
    if (!reservation.session_id && Date.now() - created > 23 * 3600000) fail(409, 'Reserva antiga requer revisao.');
    const session = reservation.session_id
      ? await liveStripe(env, 'checkout/sessions/' + encodeURIComponent(reservation.session_id))
      : await liveStripe(env, 'checkout/sessions', {
        mode: 'subscription', 'payment_method_types[0]': 'card', client_reference_id: user.id,
        ...(user.email ? { customer_email: user.email } : {}),
        'metadata[nekuma_user]': user.id, 'metadata[nekuma_plan]': 'pro',
        ...(offer.validation ? { 'metadata[nekuma_validation_price]': price.id } : {}),
        'subscription_data[metadata][nekuma_user]': user.id, 'subscription_data[metadata][nekuma_plan]': 'pro',
        'line_items[0][price]': price.id, 'line_items[0][quantity]': '1',
        success_url: 'https://app.nekumafinance.app/app?tab=plans&stripe_live=return',
        cancel_url: 'https://app.nekumafinance.app/app?tab=plans&stripe_live=cancel'
      }, 'nekuma-live-' + reservation.id);
    const boundOffer = validateLiveSession(session, user, env);
    if (session.status === 'expired') {
      await database(env, 'stripe_live_close', { target_checkout: reservation.id, target_session: session.id });
      fail(409, 'Checkout expirou. Tente novamente.');
    }
    if (session.status !== 'open') fail(409, 'Checkout concluido. Consulte seu pagamento.');
    if (boundOffer.amount !== offer.amount || boundOffer.validation !== offer.validation)
      fail(409, 'Checkout anterior possui outro preco. Encerre o checkout antigo antes de continuar.');
    const url = new URL(session.url);
    if (url.origin !== 'https://checkout.stripe.com' || url.username || url.password) fail(502, 'Destino invalido.');
    await database(env, 'stripe_live_bind', { target_checkout: reservation.id, target_session: session.id });
    return reply({ environment: 'live', approvalUrl: url.href });
  } catch (error) { return reply({ error: error.status ? error.message : 'Checkout indisponivel.' }, error.status || 503); }
}
