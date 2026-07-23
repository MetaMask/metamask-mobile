export const PAYMENT_SELECTION_MODAL_TEST_IDS = {
  HEADER_CLOSE_BUTTON: 'payment-selection-modal-header-close',
} as const;

/**
 * Stable testID for a payment method row.
 * `/payments/debit-credit-card` → `payment-method-debit-credit-card`
 */
export function paymentMethodTestId(paymentMethodId: string): string {
  const slug = paymentMethodId.replace(/^\/payments\//, '').replace(/^\//, '');
  return `payment-method-${slug || 'unknown'}`;
}
