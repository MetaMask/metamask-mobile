import { PredictHomeSelectorsIDs } from '../../../../Predict.testIds';

/**
 * Test selectors for the Predict home "Trending" section.
 * The section root reuses {@link PredictHomeSelectorsIDs.TRENDING_SECTION} so
 * the shell's composition test keeps working.
 */
export const PREDICT_TRENDING_SECTION_TEST_IDS = {
  SECTION: PredictHomeSelectorsIDs.TRENDING_SECTION,
  HEADER: 'predict-home-trending-header',
  CARD_PREFIX: 'predict-home-trending-card',
  SKELETON_PREFIX: 'predict-home-trending-skeleton',
  ERROR_STATE: 'predict-home-trending-error-state',
} as const;
