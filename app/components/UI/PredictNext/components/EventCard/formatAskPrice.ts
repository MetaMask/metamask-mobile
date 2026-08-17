import type { PredictDecimal } from '../../types';
import { roundProbabilityToWhole } from '../../utils/formatProbability';

export const formatAskPrice = (
  askPrice?: PredictDecimal,
): string | undefined =>
  askPrice === undefined ? undefined : `${roundProbabilityToWhole(askPrice)}¢`;
