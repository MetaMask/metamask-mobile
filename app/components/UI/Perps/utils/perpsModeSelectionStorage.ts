import { PERPS_MODE_SELECTION_COMPLETED } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';

/**
 * Whether the user has completed the one-time Lite/Pro mode chooser
 * ("Choose how you trade"). Orthogonal to tutorial first-time state.
 */
export const hasCompletedPerpsModeSelection = async (): Promise<boolean> => {
  const value = await StorageWrapper.getItem(PERPS_MODE_SELECTION_COMPLETED);
  return value === 'true';
};

/** Persist that the user has completed the Lite/Pro mode chooser. */
export const markPerpsModeSelectionCompleted = async (): Promise<void> => {
  await StorageWrapper.setItem(PERPS_MODE_SELECTION_COMPLETED, 'true');
};
