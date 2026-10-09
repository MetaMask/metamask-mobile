import type { PerpsFeeSource } from '@metamask/perps-controller';

export type PerpsFeeDiscountKind =
  | 'vip'
  | 'promotional'
  | 'generic'
  | undefined;

interface GetPerpsFeeDiscountParams {
  feeSource?: PerpsFeeSource;
  currentFeeRate?: number;
  originalFeeRate?: number;
}

export interface PerpsFeeDiscount {
  percentage?: number;
  kind: PerpsFeeDiscountKind;
}

/**
 * Derives presentation from the resolved quote. Attribution never proves that
 * a discount occurred: rewards can win a tie with the default fee.
 */
export function getPerpsFeeDiscount({
  feeSource,
  currentFeeRate,
  originalFeeRate,
}: GetPerpsFeeDiscountParams): PerpsFeeDiscount {
  if (
    currentFeeRate === undefined ||
    originalFeeRate === undefined ||
    originalFeeRate <= 0 ||
    currentFeeRate >= originalFeeRate
  ) {
    return { kind: undefined };
  }

  const percentage = Math.min(
    100,
    Math.max(0, ((originalFeeRate - currentFeeRate) / originalFeeRate) * 100),
  );

  if (feeSource === 'default') {
    return { kind: undefined };
  }

  if (feeSource === 'rewards') {
    return { percentage, kind: 'vip' };
  }

  if (feeSource === 'grant') {
    return { percentage, kind: 'promotional' };
  }

  return { percentage, kind: 'generic' };
}
