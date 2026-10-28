import { customer, fail, reply } from './paypal-billing.js';

export { fail, reply };

export function stripeConfiguration(env) {
  if (env.STRIPE_BILLING_MODE !== 'test' || !/^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_TEST_SECRET_KEY || '')) {
    fail(503, 'Stripe de teste ainda nao configurado.');
  }
}

export async function stripeCustomer(request, env) {
  stripeConfiguration(env);
  // Reuse the existing fresh session, blocked-account and explicit test-user checks.
  return customer(request, { ...env, PAYPAL_SANDBOX_TEST_USERS: env.STRIPE_TEST_USERS || '' });
}

export async function stripe(env, path, parameters, idempotencyKey) {
  stripeConfiguration(env);
  const response = await fetch('https://api.stripe.com/v1/' + path, {
    method: parameters ? 'POST' : 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: 'Bearer ' + env.STRIPE_TEST_SECRET_KEY,
      'Stripe-Version': '2024-06-20',
      ...(parameters ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
    },
    ...(parameters ? { body: new URLSearchParams(parameters).toString() } : {})
  });
  if (!response.ok) fail(424, 'Stripe recusou a consulta de teste (HTTP ' + response.status + ').');
  const result = await response.json();
  if (result.livemode !== false) fail(502, 'Resposta fora do ambiente de teste.');
  return result;
}

export function validateSession(session, user) {
  if (!/^cs_test_[A-Za-z0-9]+$/.test(session.id || '') || session.client_reference_id !== user.id
    || session.mode !== 'subscription' || session.currency !== 'jpy' || session.amount_total !== 480
    || session.metadata?.nekuma_plan !== 'pro' || session.metadata?.nekuma_user !== user.id) {
    fail(403, 'Checkout de teste divergente.');
  }
}
