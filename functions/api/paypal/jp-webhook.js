import { handleWebhook } from './webhook.js';

// The URL fixes the merchant profile; event bodies cannot select credentials.
export async function onRequestPost(context) {
  return handleWebhook(context, 'jp');
}
