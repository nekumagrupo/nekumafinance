import { liveStripe, validateLiveSession } from './stripe-live.js';
import { database, fail } from './paypal-billing.js';

export async function ownedLiveSubscription(env, user) {
  const binding = await database(env, 'stripe_live_lookup', { target_user: user.id });
  if (!binding?.session_id || binding.user_id !== user.id) fail(404, 'Assinatura nao encontrada.');
  const session = await liveStripe(env, 'checkout/sessions/' + encodeURIComponent(binding.session_id));
  validateLiveSession(session, user);
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId || '')) fail(409, 'Aguardando conclusao do checkout.');
  const subscription = await liveStripe(env, 'subscriptions/' + subscriptionId);
  if (subscription.metadata?.nekuma_user !== user.id || subscription.metadata?.nekuma_plan !== 'pro'
    || subscription.customer !== session.customer || subscription.test_clock
    || (binding.subscription_id && binding.subscription_id !== subscription.id)) fail(403, 'Assinatura divergente.');
  return { binding, session, subscription };
}
