import { useSelector } from 'react-redux';
import {
  selectPredictWorldCupConfig,
  selectPredictWorldCupScreenEnabledFlag,
} from '../../../../UI/Predict/selectors/featureFlags';
import { PREDICT_WORLD_CUP_TAB_KEYS } from '../../../../UI/Predict/constants/worldCupTabs';
import { usePredictWorldCupMarkets } from '../../../../UI/Predict/hooks/usePredictWorldCup';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import type { UsePredictionsFeedResult } from './usePredictionsFeed';

interface UseWorldCupPredictionsFeedOptions {
  enabled?: boolean;
  refresh?: RefreshConfig;
}

export interface UseWorldCupPredictionsFeedResult
  extends UsePredictionsFeedResult {
  isEnabled: boolean;
}

export const useWorldCupPredictionsFeed = ({
  enabled = true,
  refresh,
}: UseWorldCupPredictionsFeedOptions = {}): UseWorldCupPredictionsFeedResult => {
  const config = useSelector(selectPredictWorldCupConfig);
  const isScreenEnabled = useSelector(selectPredictWorldCupScreenEnabledFlag);
  const isEnabled = enabled && isScreenEnabled;

  const worldCupMarkets = usePredictWorldCupMarkets({
    tabKey: PREDICT_WORLD_CUP_TAB_KEYS.ALL,
    config,
    enabled: isEnabled,
  });

  useFeedRefresh(isEnabled ? refresh : undefined, worldCupMarkets.refetch);

  return {
    data: worldCupMarkets.marketData,
    isLoading: worldCupMarkets.isFetching,
    refetch: worldCupMarkets.refetch,
    fetchMore: worldCupMarkets.fetchMore,
    isFetchingMore: worldCupMarkets.isFetchingMore,
    hasMore: worldCupMarkets.hasMore,
    isEnabled,
  };
};
