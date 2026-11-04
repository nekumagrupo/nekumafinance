import { reply } from '../../_shared/paypal-billing.js';
import { liveStripe, liveConfiguration, validateLiveSession } from '../../_shared/stripe-live.js';
import { verifiedStripeEvent, processStripeTestEvent } from '../../_shared/stripe-webhook.js';

export async function onRequestPost({ request, env }) {
  try {
    liveConfiguration(env);
    const event = await verifiedStripeEvent(request, env, true);
    return reply(await processStripeTestEvent(env, event, { api: liveStripe, validate: validateLiveSession }));
  } catch (error) {
    return reply({ error: error.status ? error.message : 'Webhook indisponivel.' }, error.status === 424 ? 503 : error.status || 503);
  }
}
