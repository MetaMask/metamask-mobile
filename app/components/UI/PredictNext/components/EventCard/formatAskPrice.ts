import type { PredictDecimal } from '../../types';

export const formatAskPrice = (
  askPrice?: PredictDecimal,
): string | undefined =>
  askPrice === undefined ? undefined : `${Math.round(Number(askPrice) * 100)}¢`;
