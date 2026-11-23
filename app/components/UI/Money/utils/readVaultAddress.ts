import type { SubscriptionPaymentMethod } from '@metamask/subscription-controller';

/**
 * Reads the Plus subscription's vault-share token.
 *
 * @param paymentMethod - The subscription payment method.
 * @returns The vault address when the payment is crypto.
 */
export const readVaultAddress = (
  paymentMethod: SubscriptionPaymentMethod | undefined,
): string | undefined => {
  if (paymentMethod?.type !== 'crypto') {
    return undefined;
  }

  const crypto: object = paymentMethod.crypto;
  if (!('tokenAddress' in crypto) || typeof crypto.tokenAddress !== 'string') {
    return undefined;
  }

  return crypto.tokenAddress.length > 0 ? crypto.tokenAddress : undefined;
};
