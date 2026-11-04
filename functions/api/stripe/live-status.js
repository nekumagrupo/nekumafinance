import { liveCustomer, liveStripe, validateLiveSession } from '../../_shared/stripe-live.js';
import { database, reply, fail } from '../../_shared/paypal-billing.js';

export async function onRequestPost({ request, env }) {
  try {
    const user = await liveCustomer(request, env);
    const binding = await database(env, 'stripe_live_lookup', { target_user: user.id });
    const entitlement = await database(env, 'stripe_live_entitlement', { target_user: user.id });
    let subscription = null;
    if (binding?.session_id) {
      const session = await liveStripe(env, 'checkout/sessions/' + encodeURIComponent(binding.session_id));
      validateLiveSession(session, user);
      if (session.subscription) {
        const id = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        if (!/^sub_[A-Za-z0-9]+$/.test(id || '')) fail(503, 'Assinatura invalida.');
        subscription = await liveStripe(env, 'subscriptions/' + id);
        if (subscription.metadata?.nekuma_user !== user.id || subscription.customer !== session.customer) fail(403, 'Assinatura divergente.');
      }
    }
    let canPurchaseAgain = false;
    if (binding?.subscription_id && subscription && ['canceled','incomplete_expired'].includes(subscription.status) && entitlement?.active === false) {
      canPurchaseAgain = await database(env, 'stripe_live_finish', { target_checkout: binding.id,
        target_subscription: subscription.id, target_status: subscription.status }) === true;
    }
    return reply({ environment: 'live', available: true, active: entitlement?.active === true,
      paidUntil: entitlement?.paidUntil || null, renewalCancelled: subscription?.cancel_at_period_end === true,
      subscriptionStatus: subscription?.status || null, hasSubscription: !!subscription && !canPurchaseAgain });
  } catch (error) { return reply({ error: error.status ? error.message : 'Consulta indisponivel.' }, error.status || 503); }
}
