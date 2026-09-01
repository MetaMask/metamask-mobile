import { BigNumber } from 'bignumber.js';

/**
 * Multiplies a decimal amount string by an order count without float math.
 */
export function multiplyAmountByCount(
  amount: string,
  count: number,
): string | undefined {
  if (!amount || amount === '.' || !Number.isFinite(count) || count < 1) {
    return undefined;
  }

  const product = new BigNumber(amount).times(count);

  if (!product.isFinite()) {
    return undefined;
  }

  return product.toFixed();
}
