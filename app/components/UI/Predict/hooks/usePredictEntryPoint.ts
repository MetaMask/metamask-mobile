import TrendingFeedSessionManager from '../../Trending/services/TrendingFeedSessionManager';
import { PredictEventValues } from '../constants/eventNames';
import { PredictEntryPoint } from '../types/navigation';

/**
 * Hook to determine the effective entry point for Predict analytics.
 * Automatically detects if user is in a trending session and returns
 * the appropriate entry point.
 *
 * @param defaultEntryPoint - Fallback entry point when not from trending
 * @returns The effective entry point for analytics
 */
export const usePredictEntryPoint = (
  defaultEntryPoint: PredictEntryPoint = PredictEventValues.ENTRY_POINT
    .PREDICT_FEED,
): PredictEntryPoint => {
  // Check if user is in an active trending session
  const isFromTrending =
    TrendingFeedSessionManager.getInstance().isFromTrending;

  if (isFromTrending) {
    return PredictEventValues.ENTRY_POINT.TRENDING;
  }

  return defaultEntryPoint;
};

export default usePredictEntryPoint;
