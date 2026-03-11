/**
 * Extracts the order code from an order ID that may be a full path
 * (e.g. "/providers/paypal/orders/abc-123") or a plain order code (e.g. "abc-123").
 * The RampsController stores orders by this extracted code (providerOrderId)
 * for consistent lookup.
 */
export function extractOrderCode(orderId: string): string {
  return orderId.includes('/orders/')
    ? (orderId.split('/orders/')[1] ?? orderId)
    : orderId;
}
