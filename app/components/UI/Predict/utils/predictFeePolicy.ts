import { DiscountType } from '@metamask/bridge-controller';
import type { SubscriptionBenefitsResponse } from '@metamask/subscription-controller';
import type { PredictFeePolicy } from '../types';

/**
 * Resolves the client-side Predict fee hint.
 *
 * This policy is deliberately fail-closed. The benefits response is a
 * preflight snapshot only; the backend remains responsible for validating and
 * consuming the allowance when the order is submitted.
 *
 * @param params - Live benefits response.
 * @returns The membership fee policy when the benefit can be applied.
 */
export function resolvePredictFeePolicy({
  benefits,
}: {
  benefits: SubscriptionBenefitsResponse;
}): PredictFeePolicy | undefined {
  if (benefits.eligible !== true) {
    return undefined;
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
    return undefined;
  }

  return {
    discountType: DiscountType.SUBSCRIPTION,
    builderCode,
  };
}
