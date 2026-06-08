import { PredictHomeSelectorsIDs } from '../../../../Predict.testIds';

/**
 * Test selectors for the Predict home "Live Now" carousel section.
 * The section root reuses {@link PredictHomeSelectorsIDs.LIVE_NOW_SECTION} so
 * the shell's composition test keeps working.
 */
export const PREDICT_LIVE_NOW_SECTION_TEST_IDS = {
  SECTION: PredictHomeSelectorsIDs.LIVE_NOW_SECTION,
  HEADER: 'predict-home-live-now-header',
  CAROUSEL: 'predict-home-live-now-carousel',
  CARD_PREFIX: 'predict-home-live-now-card',
  SKELETON_PREFIX: 'predict-home-live-now-skeleton',
  PAGINATION_DOTS: 'predict-home-live-now-pagination-dots',
} as const;
