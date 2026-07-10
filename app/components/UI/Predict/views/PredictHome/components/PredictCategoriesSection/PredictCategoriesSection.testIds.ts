import { PredictHomeSelectorsIDs } from '../../../../Predict.testIds';

/**
 * Test selectors for the Predict home "Categories" section.
 * The section root reuses {@link PredictHomeSelectorsIDs.CATEGORIES_SECTION} so
 * the shell's composition test keeps working. Per-tile IDs are derived from the
 * category id (e.g. `predict-home-categories-tile-politics`).
 */
export const PREDICT_CATEGORIES_SECTION_TEST_IDS = {
  SECTION: PredictHomeSelectorsIDs.CATEGORIES_SECTION,
  HEADER: 'predict-home-categories-header',
  TILE_PREFIX: 'predict-home-categories-tile',
} as const;
