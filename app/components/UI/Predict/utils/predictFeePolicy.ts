import type { SubscriptionBenefitsResponse } from '@metamask/subscription-controller';
import type { OrderPreview, PredictFeePolicy } from '../types';

type PredictFeePolicyParams = Pick<
  OrderPreview,
  'feePolicy' | 'fees' | 'originalFees'
>;

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
  const builderCode = predictBenefits.builderCode?.trim();
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
    builderCode,
  };
}

/**
 * Synchronizes fee policy metadata and fee snapshots with the current policy.
 *
 * @param params - Preview or provider parameters that may contain fee policy data.
 * @param feePolicy - The currently available fee policy.
 * @returns Parameters with stale policy metadata removed and the current policy applied.
 */
export function syncPreviewWithFeePolicy<T extends PredictFeePolicyParams>(
  params: T,
  feePolicy?: PredictFeePolicy,
): T {
  const previousFeePolicy = params.feePolicy;
  const paramsWithFeePolicy = { ...params };
  delete paramsWithFeePolicy.feePolicy;

  if (!feePolicy) {
    if (previousFeePolicy && params.originalFees) {
      paramsWithFeePolicy.fees = params.originalFees;
    } else if (previousFeePolicy) {
      delete paramsWithFeePolicy.fees;
    }

    delete paramsWithFeePolicy.originalFees;
    return paramsWithFeePolicy;
  }

  return { ...paramsWithFeePolicy, feePolicy };
}
