/**
 * Best-effort parsing of Crossmint embedded checkout `postMessage` events.
 *
 * On iOS 15 the WebView sets `enableApplePay`, which drops the usual
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
    /** Payload of `ui:height.changed`, the checkout's own content height. */
    height?: number;
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
  const unpurchasable = getCrossmintUnpurchasableMessage(message);
  if (unpurchasable) {
    return unpurchasable;
  }

  return message.data?.order?.payment?.failureReason?.message ?? null;
}

/**
 * Failure reported before any payment could start: the order never got a
 * quote (creation failed, or the line item is unavailable, e.g. "This item is
 * not available for purchase with Crossmint at this moment"). Crossmint still
 * renders and reports its payment button ready for such an order, but it
 * cannot be paid, so the caller must not offer that button. Distinct from a
 * payment decline, where the button is a valid retry.
 */
export function getCrossmintUnpurchasableMessage(
  message: CrossmintCheckoutMessage,
): string | null {
  if (message.event === 'order:creation-failed') {
    return message.data?.message ?? 'Order creation failed';
  }

  return (
    message.data?.order?.lineItems?.[0]?.quote?.unavailabilityReason?.message ??
    null
  );
}
