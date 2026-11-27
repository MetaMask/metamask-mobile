import type { PredictDecimal } from '../../../types';
import { getAskPricePercent } from './getAskPricePercent';

export const formatAskPricePercent = (
  askPrice?: PredictDecimal,
): string | undefined => {
  const percent = getAskPricePercent(askPrice);

  return percent === undefined ? undefined : `${Math.round(percent)}%`;
};
