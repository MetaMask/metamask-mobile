import type { SubscriptionBenefitsResponse } from '@metamask/subscription-controller';
import type { PredictFeePolicy } from '../types';

/**
 * Creates the standard Predict fee policy.
 *
 * @param standardMetamaskFee - The configured MetaMask service fee.
 * @returns The standard fee policy.
 */
export const getStandardPredictFeePolicy = (
  standardMetamaskFee: number,
): PredictFeePolicy => ({
  status: 'standard',
  effectiveMetamaskFee: standardMetamaskFee,
});

/**
 * Resolves the client-side Predict fee hint.
 *
 * This policy is deliberately fail-closed. The benefits response is a
 * preflight snapshot only; the backend remains responsible for validating and
 * consuming the allowance when the order is submitted.
 *
 * @param params - Live benefits response and standard fee inputs.
 * @returns The effective client-side fee policy.
 */
export function resolvePredictFeePolicy({
  benefits,
  standardMetamaskFee,
}: {
  benefits: SubscriptionBenefitsResponse;
  standardMetamaskFee: number;
}): PredictFeePolicy {
  if (benefits.eligible !== true) {
    return getStandardPredictFeePolicy(standardMetamaskFee);
  }

  const predictBenefits = benefits.products.predict;
  const builderCode = predictBenefits.builderCode?.trim() ?? '';
  const remainingTxCount = predictBenefits.remainingTxCount;
  const hasRemainingTransactions =
    remainingTxCount !== null &&
    Number.isInteger(remainingTxCount) &&
    remainingTxCount > 0;

  if (
    !builderCode ||
    predictBenefits.exhausted !== false ||
    !hasRemainingTransactions
  ) {
    return getStandardPredictFeePolicy(standardMetamaskFee);
  }

  return {
    status: 'membership',
    effectiveMetamaskFee: 0,
    builderCode,
  };
}
