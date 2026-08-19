import BigNumber from 'bignumber.js';
import { parsePredictDecimal } from './parsePredictDecimal';

const MILLION = new BigNumber('1000000');
const THOUSAND = new BigNumber('1000');

const trimTrailingZeros = (value: BigNumber): string =>
  value.toFixed(2).replace(/\.?0+$/, '');

export const formatVolume = (volume?: string): string | undefined => {
  const amount = parsePredictDecimal(volume);

  if (amount === undefined || amount.lt(0)) {
    return undefined;
  }

  if (amount.gte(MILLION)) {
    return `${trimTrailingZeros(amount.div(MILLION))}M`;
  }

  if (amount.gte(THOUSAND)) {
    return `${trimTrailingZeros(amount.div(THOUSAND))}k`;
  }

  return amount.integerValue(BigNumber.ROUND_FLOOR).toFixed(0);
};
