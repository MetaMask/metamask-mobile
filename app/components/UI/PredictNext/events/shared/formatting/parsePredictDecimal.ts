import type { BigNumber } from 'bignumber.js';
import { safeParseBigNumber } from '../../../../../../util/number/bignumber';

export const parsePredictDecimal = (value?: string): BigNumber | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const amount = safeParseBigNumber(value);

  if (!amount.isFinite()) {
    return undefined;
  }

  return amount;
};
