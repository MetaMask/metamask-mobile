import { strings } from '../../../../../locales/i18n';
import type { PredictEntryContext, PredictOutcomeSide } from '../types';

/** The held or traded Outcome's label, else the localized Outcome side.
 * Never a Venue identifier. */
export const getOutcomeName = (
  side: PredictOutcomeSide,
  context?: PredictEntryContext,
): string =>
  context?.outcomeLabel ??
  strings(`predict_next.portfolio.outcome_side.${side}`);

/** The Event title, else neutral copy: a raw Venue identifier is never a
 * title. */
export const getEntryTitle = (context?: PredictEntryContext): string =>
  context?.eventTitle ?? strings('predict_next.portfolio.unknown_market');
