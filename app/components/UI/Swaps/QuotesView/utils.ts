import { Quote } from '@metamask/swaps-controller/dist/swapsInterfaces';
import BigNumber from 'bignumber.js';

/**
 * Multiplies gasLimit by multiplier if both defined
 * @param {string} gasLimit
 * @param {number} multiplier
 */
export const getGasLimitWithMultiplier = (
  gasLimit: string,
  multiplier: number,
) => {
  try {
    if (!gasLimit || !multiplier) return;
    const gasLimitWithMultiplier = new BigNumber(gasLimit)
      .times(multiplier)
      .integerValue();
    return gasLimitWithMultiplier.isNaN() ? undefined : gasLimitWithMultiplier;
  } catch (e) {
    return undefined;
  }
};

export const isValidDestinationAmount = (quote: Quote) => {
  try {
    const bn = new BigNumber(quote.destinationAmount);
    return Boolean(bn) && !bn.isNaN();
  } catch (e) {
    return false;
  }
};
