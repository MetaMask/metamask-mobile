import { PredictEntryPoint } from '../types/navigation';
import { PredictEventValues } from '../constants/eventNames';
import { usePredictEntryPoint } from '../contexts';
import TrendingFeedSessionManager from '../../Trending/services/TrendingFeedSessionManager';

export function useResolvedPredictEntryPoint(
  propEntryPoint: PredictEntryPoint | undefined,
): PredictEntryPoint {
  const contextEntryPoint = usePredictEntryPoint();

  if (contextEntryPoint) return contextEntryPoint;
  if (propEntryPoint) return propEntryPoint;
  if (TrendingFeedSessionManager.getInstance().isFromTrending) {
    return PredictEventValues.ENTRY_POINT.TRENDING;
  }
  return PredictEventValues.ENTRY_POINT.PREDICT_FEED;
}
