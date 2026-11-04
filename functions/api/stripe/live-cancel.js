import { liveCustomer, liveStripe } from '../../_shared/stripe-live.js';
import { ownedLiveSubscription } from '../../_shared/stripe-live-subscription.js';
import { boundedJson, fail, reply } from '../../_shared/paypal-billing.js';

export async function onRequestPost({ request, env }) {
  try {
    const user = await liveCustomer(request, env);
    const body = await boundedJson(request, 1024);
    if (body.cancelRenewal !== true || !/^[a-f0-9-]{36}$/i.test(body.attempt || '')) fail(400, 'Confirme o cancelamento da renovacao.');
    const { subscription } = await ownedLiveSubscription(env, user);
    if (!['active','past_due','trialing'].includes(subscription.status)) fail(409, 'Esta assinatura nao possui renovacao ativa.');
    const result = subscription.cancel_at_period_end ? subscription : await liveStripe(env, 'subscriptions/' + subscription.id,
      { cancel_at_period_end: 'true' }, 'nekuma-live-cancel-' + subscription.id + '-' + body.attempt);
    if (result.id !== subscription.id || result.cancel_at_period_end !== true) fail(503, 'Cancelamento ainda nao confirmado.');
    return reply({ environment: 'live', renewalCancelled: true });
  } catch (error) { return reply({ error: error.status ? error.message : 'Cancelamento indisponivel.' }, error.status || 503); }
}
