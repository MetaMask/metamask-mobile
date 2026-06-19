import { ethers } from 'ethers';
import { BigNumber } from 'bignumber.js';

/**
 * Parses a decimal amount string into atomic units, safely handling cases where
 * the amount has more fractional precision than the token's decimals support.
 * Rounds up (away from zero) when truncation is needed, so amounts representing
 * a required/threshold value are never under-counted.
 *
 * @param amount - The decimal amount string (may exceed `decimals` precision)
 * @param decimals - The token's decimal precision
 * @returns The atomic-unit BigNumber, or null if amount/decimals are unavailable
 */
export const parseUnitsSafe = (
  amount: string | null | undefined,
  decimals: number | null | undefined,
): ethers.BigNumber | null => {
  if (!amount || decimals == null) {
    return null;
  }

  const safeAmount =
    decimals === 18
      ? amount
      : new BigNumber(amount).toFixed(decimals, BigNumber.ROUND_UP);

  return ethers.utils.parseUnits(safeAmount, decimals);
};
