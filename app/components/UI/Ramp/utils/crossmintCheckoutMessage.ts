/**
 * Best-effort parsing of Crossmint embedded checkout `postMessage` events.
 *
 * With `enableApplePay` set on the WebView, iOS disables the usual
 * `ReactNativeWebView.postMessage` polyfill, so these events may never
 * arrive; order state is authoritatively tracked by polling the on-ramp
 * API through the precreated-order processor.
 */

export interface CrossmintCheckoutOrder {
  phase?: string;
  payment?: {
    status?: string;
    failureReason?: { message?: string };
  };
  lineItems?: {
    quote?: { unavailabilityReason?: { message?: string } };
  }[];
}

export interface CrossmintCheckoutMessage {
  event: string;
  data?: {
    message?: string;
    order?: CrossmintCheckoutOrder;
  };
}

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

export function isCrossmintPaymentCompleted(
  order?: CrossmintCheckoutOrder,
): boolean {
  if (!order) {
    return false;
  }
  if (order.payment?.status === 'completed') {
    return true;
  }
  return order.phase === 'delivery' || order.phase === 'completed';
}

/**
 * True once the user has authorized payment and Crossmint is settling the
 * order (post wallet-pay authorization), but before delivery/completion.
 */
export function isCrossmintPaymentInProgress(
  order?: CrossmintCheckoutOrder,
): boolean {
  if (!order || isCrossmintPaymentCompleted(order)) {
    return false;
  }
  const status = order.payment?.status;
  return status === 'in-progress' || status === 'crypto-payouts-in-progress';
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
