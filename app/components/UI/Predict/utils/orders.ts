import QuickCrypto from 'react-native-quick-crypto';
import type { OrderPreview, PredictFees } from '../types';

const CENTS_PER_UNIT = 100;
const CENT_ROUNDING_TOLERANCE = 1e-8;

/**
 * Generates a unique order ID using react-native-quick-crypto's randomUUID
 * @returns A unique order ID string
 */
export function generateOrderId(): string {
  return QuickCrypto.randomUUID();
}

export function calculateMaxBetAmount(
  availableBalance: number,
  preview?: OrderPreview | null,
): number {
  if (!Number.isFinite(availableBalance) || availableBalance <= 0) {
    return 0;
  }

  const fees = preview?.fees;
  const serviceFeeRate = Math.max(fees?.totalFeePercentage ?? 0, 0) / 100;
  const previewStake = preview?.maxAmountSpent ?? 0;
  const marketFeeRate =
    previewStake > 0 ? Math.max(fees?.marketFee ?? 0, 0) / previewStake : 0;
  const maxBetAmount = availableBalance / (1 + serviceFeeRate + marketFeeRate);

  // The keypad accepts cents, so floor rather than round to avoid exceeding
  // the wallet balance after fees are added back to the stake.
  return roundDownToCents(maxBetAmount);
}

export function roundUpToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const amountInCents = amount * CENTS_PER_UNIT;

  return Math.ceil(amountInCents - CENT_ROUNDING_TOLERANCE) / CENTS_PER_UNIT;
}

export function roundDownToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const amountInCents = amount * CENTS_PER_UNIT;

  return Math.floor(amountInCents + CENT_ROUNDING_TOLERANCE) / CENTS_PER_UNIT;
}

export function roundToFiveDecimals(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round((amount + Number.EPSILON) * 100000) / 100000;
}

export function getPredictMarketFee(fees?: PredictFees): number {
  return fees?.marketFee ?? 0;
}

export function getPredictExchangeFee(fees?: PredictFees): number {
  return (fees?.providerFee ?? 0) + getPredictMarketFee(fees);
}

export function getPredictSellNetProceeds(
  preview?: OrderPreview | null,
): number {
  if (!preview) {
    return 0;
  }
  const fees = preview.fees;
  return roundDownToCents(
    preview.minAmountReceived -
      (fees?.metamaskFee ?? 0) -
      getPredictExchangeFee(fees),
  );
}

export function getPredictBuyAllInCost(preview?: OrderPreview | null): number {
  if (!preview) {
    return 0;
  }

  const fees = preview.fees;

  return roundUpToCents(
    preview.maxAmountSpent +
      (fees?.metamaskFee ?? 0) +
      (fees?.providerFee ?? 0) +
      getPredictMarketFee(fees),
  );
}
