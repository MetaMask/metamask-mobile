import { strings } from '../../../../../../../locales/i18n';
import { PREDICT_MARKET_TYPES } from '../../../constants';
import type { PredictMarket, PredictThresholdLine } from '../../../types';

/** A threshold Market's line, from its group. Undefined for any other. */
const toThresholdLine = (
  market: PredictMarket,
): PredictThresholdLine | undefined =>
  market.group?.marketType === PREDICT_MARKET_TYPES.THRESHOLD &&
  market.group.option?.type === 'number'
    ? { line: market.group.option.value, label: market.group.label }
    : undefined;

const thresholdParts = ({
  line,
  label,
}: PredictThresholdLine): { label?: string; line: string } => ({
  label: label?.trim() || undefined,
  // Prints the value as sent: whole numbers are the API's job.
  line: strings('predict.market_groups.threshold_option', { value: line }),
});

const nameLine = (threshold: PredictThresholdLine): string => {
  const parts = thresholdParts(threshold);
  return parts.label
    ? strings('predict.market_groups.threshold_line', parts)
    : parts.line;
};

/**
 * An Outcome named with a threshold line, wherever the line is not on
 * screen: "Yes · Josh Jacobs · 60+", or "Yes · 60+" without a label. A
 * threshold line's Outcomes are only "Yes" and "No", so two Players' lines
 * would otherwise read the same. Takes the line as an entry's catalog
 * context sends it.
 */
export const formatThresholdLineOutcome = (
  threshold: PredictThresholdLine,
  outcome: string,
): string =>
  strings('predict.market_groups.threshold_order_outcome', {
    outcome,
    line: nameLine(threshold),
  });

/**
 * Names a threshold line on its own, outside its card: the card's label and
 * the line ("Josh Jacobs · 60+"), or just the line without a label. Undefined
 * for any other Market.
 */
export const formatThresholdLine = (
  market: PredictMarket,
): string | undefined => {
  const threshold = toThresholdLine(market);
  return threshold && nameLine(threshold);
};

/**
 * An Outcome named with its threshold line, wherever the line is not on
 * screen: "Yes · Josh Jacobs · 60+", or "Yes · 60+" without a label. A
 * threshold line's Outcomes are only "Yes" and "No", so two Players' lines
 * would otherwise read the same. Undefined for any other Market.
 */
export const formatThresholdOutcome = (
  market: PredictMarket,
  outcome: string,
): string | undefined => {
  const threshold = toThresholdLine(market);
  return threshold && formatThresholdLineOutcome(threshold, outcome);
};

/**
 * A threshold card's title: the card's label and the selected line
 * ("Josh Jacobs: 60+"), or just the line without a label. Undefined for any
 * other Market.
 */
export const formatThresholdTitle = (
  market: PredictMarket,
): string | undefined => {
  const threshold = toThresholdLine(market);
  if (!threshold) {
    return undefined;
  }
  const parts = thresholdParts(threshold);
  return parts.label
    ? strings('predict.market_groups.threshold_title', parts)
    : parts.line;
};
