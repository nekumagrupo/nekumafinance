import { reply } from '../../_shared/stripe-billing.js';
import { verifiedStripeEvent, processStripeTestEvent } from '../../_shared/stripe-webhook.js';

export async function onRequestPost({ request, env }) {
  try {
    if (env.STRIPE_TEST_ACCESS_ENABLED !== 'true') return reply({ error: 'Processamento Stripe de teste nao habilitado.' }, 503);
    const event = await verifiedStripeEvent(request, env);
    return reply(await processStripeTestEvent(env, event));
  } catch (error) {
    const status = error.status === 424 ? 503 : error.status || 503;
    return reply({ error: error.status ? error.message : 'Webhook Stripe indisponivel.' }, status);
  }
}
