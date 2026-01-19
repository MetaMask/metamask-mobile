import QuickCrypto from 'react-native-quick-crypto';

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
