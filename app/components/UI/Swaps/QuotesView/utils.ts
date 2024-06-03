import { Quote } from '@metamask/swaps-controller/dist/swapsInterfaces';
import BigNumber from 'bignumber.js';

/**
 * Multiplies gasLimit by multiplier if both defined
 * Simulation for gas required is conducted at block T,
 * but we don't know what it will be at T+1.
 * So, we multiply the gasLimit by a multiplier to add a (reasonable) buffer,
 * not so low that network conditions in next block cause a failure,
 * but not so high that the user doesn't have enough gas to cover it.
 *
 * @param {string} gasLimit
 * @param {number} multiplier
 */
export const getEstimatedSafeGasLimit = (
  gasLimit: string,
  multiplier: number,
) => {
  try {
    if (!gasLimit || !multiplier) return;
    const gasLimitWithMultiplier = new BigNumber(gasLimit)
      .times(multiplier)
      .integerValue();
    return gasLimitWithMultiplier.isNaN() || !gasLimitWithMultiplier.isFinite()
      ? undefined
      : gasLimitWithMultiplier;
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
