import { useSelector } from 'react-redux';
import { usePredictWorldCupMarkets } from '../../../../../UI/Predict/hooks/usePredictWorldCup';
import type { UsePredictMarketDataResult } from '../../../../../UI/Predict/hooks/usePredictMarketData';
import { PREDICT_WORLD_CUP_TAB_KEYS } from '../../../../../UI/Predict/constants/worldCupTabs';
import { selectPredictWorldCupConfig } from '../../../../../UI/Predict/selectors/featureFlags';

interface UseHomepagePredictWorldCupMarketsArgs {
  enabled: boolean;
}

/**
 * Homepage discovery: loads World Cup markets using the same ALL-tab query path
 * as the dedicated World Cup screen (`buildPredictWorldCupAllQuery` → keyset API).
 */
export function useHomepagePredictWorldCupMarkets({
  enabled,
}: UseHomepagePredictWorldCupMarketsArgs): UsePredictMarketDataResult {
  const config = useSelector(selectPredictWorldCupConfig);

  return usePredictWorldCupMarkets({
    tabKey: PREDICT_WORLD_CUP_TAB_KEYS.ALL,
    config,
    enabled,
  });
}

export type UseHomepagePredictWorldCupMarketsResult =
  UsePredictMarketDataResult;
