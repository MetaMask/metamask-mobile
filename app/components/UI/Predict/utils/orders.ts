import QuickCrypto from 'react-native-quick-crypto';
import type { OrderPreview, PredictFees } from '../types';

/**
 * Generates a unique order ID using react-native-quick-crypto's randomUUID
 * @returns A unique order ID string
 */
export function generateOrderId(): string {
  return QuickCrypto.randomUUID();
}

export function calculateMaxBetAmount(
  amount: number,
  totalFeePercentage: number,
): number {
  if (totalFeePercentage === 0) {
    return amount;
  }
  const maxBetAmount = amount * (1 - totalFeePercentage / 100);
  // Round to 4 decimals (same as calculateFees in polymarket/utils.ts)
  return Math.round(maxBetAmount * 10000) / 10000;
}

export function roundUpToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.ceil((amount - Number.EPSILON) * 100) / 100;
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
