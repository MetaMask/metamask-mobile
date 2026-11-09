import { strings } from '../../../../../../../locales/i18n';
import { PREDICT_MARKET_TYPES } from '../../../constants';
import type { PredictMarket } from '../../../types';
import { formatMarketGroupOption } from './formatMarketGroupOption';

const thresholdParts = (
  market: PredictMarket,
): { label?: string; line: string } | undefined => {
  if (market.group?.marketType !== PREDICT_MARKET_TYPES.THRESHOLD) {
    return undefined;
  }
  const line = formatMarketGroupOption(market);
  if (line === undefined) {
    return undefined;
  }
  return { label: market.group.label?.trim() || undefined, line };
};

/**
 * Names a threshold line on its own, outside its card: the card's label and
 * the line ("Josh Jacobs · 60+"), or just the line without a label. Undefined
 * for any other Market.
 */
export const formatThresholdLine = (
  market: PredictMarket,
): string | undefined => {
  const parts = thresholdParts(market);
  if (!parts) {
    return undefined;
  }
  return parts.label
    ? strings('predict.market_groups.threshold_line', parts)
    : parts.line;
};

/**
 * A threshold card's title: the card's label and the selected line
 * ("Josh Jacobs: 60+"), or just the line without a label. Undefined for any
 * other Market.
 */
export const formatThresholdTitle = (
  market: PredictMarket,
): string | undefined => {
  const parts = thresholdParts(market);
  if (!parts) {
    return undefined;
  }
  return parts.label
    ? strings('predict.market_groups.threshold_title', parts)
    : parts.line;
};
