import {
  usePredictMarketData,
  UsePredictMarketDataResult,
} from '../../../../../UI/Predict/hooks/usePredictMarketData';
import { PREDICT_HOME_NBA_CHAMPION_EVENT_QUERY } from '../constants/homepageNbaChampionDiscovery';

/** Predefined query parameter slugs the homepage rail loads. */
export const HOMEPAGE_PREDICT_TAG_QUERIES = {
  nbaChampion: PREDICT_HOME_NBA_CHAMPION_EVENT_QUERY,
} as const;

interface UseHomepagePredictTaggedMarketsArgs {
  enabled: boolean;
  customQueryParams: string;
  pageSize?: number;
}

/**
 * Homepage discovery: thin wrapper around `usePredictMarketData` that pins the
 * `sports` category and a caller-supplied tag query. Used for both the World
 * Cup feed (event counts + winner row) and the NBA Champion event row.
 */
export function useHomepagePredictTaggedMarkets({
  enabled,
  customQueryParams,
  pageSize = 100,
}: UseHomepagePredictTaggedMarketsArgs): UsePredictMarketDataResult {
  return usePredictMarketData({
    category: 'sports',
    customQueryParams,
    pageSize,
    enabled,
  });
}

export type UseHomepagePredictTaggedMarketsResult = UsePredictMarketDataResult;
