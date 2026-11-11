import { strings } from '../../../../../locales/i18n';
import type { PredictEntryContext, PredictOutcomeSide } from '../types';

const NAME_SEPARATOR = ' · ';

/** The held or traded Outcome's label followed by the context's Market
 * labels ("Yes · Josh Jacobs · 60+"), else the localized Outcome side. The
 * backend formats the labels; this only joins them. Never a Venue
 * identifier. */
export const getOutcomeName = (
  side: PredictOutcomeSide,
  context?: PredictEntryContext,
): string =>
  context
    ? [context.outcomeLabel, ...(context.marketLabels ?? [])].join(
        NAME_SEPARATOR,
      )
    : strings(`predict_next.portfolio.outcome_side.${side}`);

/** The Event title, else neutral copy: a raw Venue identifier is never a
 * title. */
export const getEntryTitle = (context?: PredictEntryContext): string =>
  context?.eventTitle ?? strings('predict_next.portfolio.unknown_market');
