import type {
  FeeCalculationResult,
  PerpsFeeSource,
} from '@metamask/perps-controller';

export type PerpsFeeDiscountKind = 'member' | 'vip' | 'promotional' | 'generic';

interface GetPerpsFeeDiscountParams {
  feeSource?: PerpsFeeSource;
  currentFeeRate?: number;
  originalFeeRate?: number;
}

export interface PerpsFeeDiscount {
  percentage?: number;
  kind: PerpsFeeDiscountKind | undefined;
}

/** Hundredths match the fees tooltip, which prints this number with toString(). */
const FEE_DISCOUNT_PERCENTAGE_SCALE = 100;

/**
 * Original MetaMask rate for presentation.
 *
 * Core supplies the undiscounted rate whenever a resolved quote has a
 * discount. Undiscounted quotes use the current rate.
 */
export function getPresentedOriginalMetamaskFeeRate(
  fees: FeeCalculationResult & { metamaskFeeRate: number },
): number;
export function getPresentedOriginalMetamaskFeeRate(
  fees: FeeCalculationResult,
): number | undefined;
export function getPresentedOriginalMetamaskFeeRate(
  fees: FeeCalculationResult,
): number | undefined {
  return fees.undiscountedMetamaskFeeRate ?? fees.metamaskFeeRate;
}

/**
 * Percent reduction from an original fee amount or rate to the current one.
 *
 * Rounded to hundredths so binary division noise (0.0009 versus 0.001 is
 * 10.000000000000005) does not reach the fees tooltip.
 *
 * @param originalFee - Fee amount or rate before the discount.
 * @param currentFee - Fee amount or rate after the discount.
 * @returns Discount percent in the range (0, 100], or undefined when there is no reduction.
 */
export function getPerpsFeeDiscountPercentage(
  originalFee: number,
  currentFee: number,
): number | undefined {
  if (
    !Number.isFinite(originalFee) ||
    !Number.isFinite(currentFee) ||
    originalFee <= 0 ||
    currentFee >= originalFee
  ) {
    return undefined;
  }

  const percentage = Math.min(
    100,
    Math.max(0, ((originalFee - currentFee) / originalFee) * 100),
  );
  const rounded =
    Math.round(percentage * FEE_DISCOUNT_PERCENTAGE_SCALE) /
    FEE_DISCOUNT_PERCENTAGE_SCALE;

  return rounded > 0 ? rounded : undefined;
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
  if (currentFeeRate === undefined || originalFeeRate === undefined) {
    return { kind: undefined };
  }

  const percentage = getPerpsFeeDiscountPercentage(
    originalFeeRate,
    currentFeeRate,
  );
  if (percentage === undefined) {
    return { kind: undefined };
  }

  if (feeSource === 'default') {
    return { kind: undefined };
  }

  if (feeSource === 'rewards') {
    return { percentage, kind: 'vip' };
  }

  if (feeSource === 'subscription') {
    return { percentage, kind: 'member' };
  }

  if (feeSource === 'grant') {
    return { percentage, kind: 'promotional' };
  }

  return { percentage, kind: 'generic' };
}
