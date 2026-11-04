import {
  PredictEventValues,
  type PredictEntryActions,
  type PredictEntryPoint,
  type PredictFeedCategory,
} from '../../../../UI/PredictNext';
import type { PredictionsVariant } from '../../../../UI/Predict/trending/usePredictionsFeed';

const VARIANT_TO_FEED: Record<PredictionsVariant, PredictFeedCategory> = {
  trending: 'trending',
  sports: 'sports',
  crypto: 'crypto',
  politics: 'politics',
};

/** Open the Predict feed for a variant. */
export const navigateToPredictionsList = (
  openPredict: PredictEntryActions['openPredict'],
  variant: PredictionsVariant,
  entryPoint: PredictEntryPoint = PredictEventValues.ENTRY_POINT.EXPLORE,
): void => {
  openPredict({
    type: 'feed',
    category: VARIANT_TO_FEED[variant],
    entryPoint,
  });
};

/** Open the Predict feed from Explore prediction sections. */
export const navigateToExplorePredictionsList = (
  openPredict: PredictEntryActions['openPredict'],
  variant: PredictionsVariant,
): void => {
  navigateToPredictionsList(
    openPredict,
    variant,
    PredictEventValues.ENTRY_POINT.EXPLORE,
  );
};
