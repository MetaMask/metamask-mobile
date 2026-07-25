import type { CrossmintCheckoutMessage, CrossmintOrder } from './types';

export function parseCrossmintCheckoutMessage(
  raw: string,
): CrossmintCheckoutMessage | null {
  try {
    const parsed = JSON.parse(raw) as CrossmintCheckoutMessage;
    if (!parsed || typeof parsed.event !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isCrossmintPaymentCompleted(order?: CrossmintOrder): boolean {
  if (!order) {
    return false;
  }

  if (order.payment?.status === 'completed') {
    return true;
  }

  return order.phase === 'delivery' || order.phase === 'completed';
}

export function getCrossmintFailureMessage(
  message: CrossmintCheckoutMessage,
): string | null {
  if (message.event === 'order:creation-failed') {
    return message.data?.message ?? 'Order creation failed';
  }

  const failure = message.data?.order?.payment?.failureReason?.message;
  if (failure) {
    return failure;
  }

  const quoteFailure =
    message.data?.order?.lineItems?.[0]?.quote?.unavailabilityReason?.message;
  return quoteFailure ?? null;
}
