import { strings } from '../../../../../locales/i18n';
import { formatThresholdLineOutcome } from '../events/shared/formatting';
import type { PredictEntryContext, PredictOutcomeSide } from '../types';

/** The held or traded Outcome's label, named with its threshold line when
 * the context carries one ("Yes · Josh Jacobs · 60+"), else the localized
 * Outcome side. Never a Venue identifier. */
export const getOutcomeName = (
  side: PredictOutcomeSide,
  context?: PredictEntryContext,
): string => {
  if (!context) {
    return strings(`predict_next.portfolio.outcome_side.${side}`);
  }
  return context.threshold
    ? formatThresholdLineOutcome(context.threshold, context.outcomeLabel)
    : context.outcomeLabel;
};

/** The Event title, else neutral copy: a raw Venue identifier is never a
 * title. */
export const getEntryTitle = (context?: PredictEntryContext): string =>
  context?.eventTitle ?? strings('predict_next.portfolio.unknown_market');
