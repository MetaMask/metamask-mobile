import {
  CRYPTO_AUTH_METHODS,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  type PricingCryptoPaymentMethod,
  type PricingResponse,
} from '@metamask/subscription-controller';
import type { Hex } from '@metamask/utils';

export interface MoneyAccountPlusCryptoPayment {
  chainId: Hex;
  tokenSymbol: string;
  tokenAddress: Hex;
}

/**
 * Resolves the delegation payment chain and settlement token for Plus.
 *
 * @param pricing - Cached subscription pricing.
 * @param chainId - Chain configured for the primary Money Account vault.
 * @returns Payment details, or undefined when pricing has no matching route.
 */
export function getMoneyAccountPlusCryptoPayment(
  pricing: PricingResponse | undefined,
  chainId: Hex,
): MoneyAccountPlusCryptoPayment | undefined {
  const paymentMethod = pricing?.paymentMethods.find(
    (method): method is PricingCryptoPaymentMethod =>
      method.type === PAYMENT_TYPES.byCrypto &&
      method.cryptoAuthMethod === CRYPTO_AUTH_METHODS.DELEGATION &&
      method.products?.includes(PRODUCT_TYPES.MONEY_ACCOUNT_PLUS) === true,
  );
  const chain = paymentMethod?.chains?.find(
    (paymentChain) => paymentChain.chainId === chainId,
  );
  const token = chain?.tokens[0];

  if (!chain || !token) {
    return undefined;
  }

  return {
    chainId: chain.chainId,
    tokenSymbol: token.symbol,
    tokenAddress: token.address,
  };
}
