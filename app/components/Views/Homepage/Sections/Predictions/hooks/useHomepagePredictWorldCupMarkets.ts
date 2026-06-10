import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { usePredictWorldCupMarkets } from '../../../../../UI/Predict/hooks/usePredictWorldCup';
import type { UsePredictMarketDataResult } from '../../../../../UI/Predict/hooks/usePredictMarketData';
import { PREDICT_WORLD_CUP_TAB_KEYS } from '../../../../../UI/Predict/constants/worldCupTabs';
import { selectPredictWorldCupConfig } from '../../../../../UI/Predict/selectors/featureFlags';
import { PREDICT_WORLD_CUP_DEFAULT_TAG_SLUG } from '../../../../../UI/Predict/constants/flags';
import { getPolymarketEndpoints } from '../../../../../UI/Predict/providers/polymarket/utils';

interface UseHomepagePredictWorldCupMarketsArgs {
  enabled: boolean;
}

interface UseHomepagePredictWorldCupEventCountResult {
  eventCount?: number;
  isFetching: boolean;
  refetch: () => Promise<void>;
}

const HOMEPAGE_PREDICT_WORLD_CUP_EVENT_COUNT_LIMIT = 1;
const HOMEPAGE_PREDICT_WORLD_CUP_EVENT_COUNT_STALE_TIME = 10_000;

const homepagePredictWorldCupEventCountKeys = {
  all: (queryParams: string) =>
    [
      'homepage',
      'predict',
      'worldCup',
      'eventCount',
      'paginationTotalResults',
      queryParams,
    ] as const,
};

const buildHomepagePredictWorldCupEventCountQuery = (): string => {
  const queryParams = new URLSearchParams();
  queryParams.set('tag_slug', PREDICT_WORLD_CUP_DEFAULT_TAG_SLUG);
  queryParams.set(
    'limit',
    String(HOMEPAGE_PREDICT_WORLD_CUP_EVENT_COUNT_LIMIT),
  );
  queryParams.set('active', 'true');
  queryParams.set('closed', 'false');
  queryParams.set('archived', 'false');

  return queryParams.toString();
};

const fetchHomepagePredictWorldCupEventCount = async (): Promise<number> => {
  const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
  const queryParams = buildHomepagePredictWorldCupEventCountQuery();

  const response = await fetch(
    `${GAMMA_API_ENDPOINT}/events/pagination?${queryParams}`,
  );

  if (!response.ok) {
    throw new Error('Failed to get homepage World Cup event count');
  }

  const data = await response.json();
  const totalResults = data?.pagination?.totalResults;

  return typeof totalResults === 'number' ? totalResults : 0;
};

/**
 * Homepage discovery: loads World Cup markets using the same ALL-tab query path
 * as the dedicated World Cup screen, but keeps its event-count query private to
 * this hook so `/events/pagination` is only requested by the homepage row.
 */
export function useHomepagePredictWorldCupEventCount({
  enabled,
}: UseHomepagePredictWorldCupMarketsArgs): UseHomepagePredictWorldCupEventCountResult {
  const eventCountQueryParams = buildHomepagePredictWorldCupEventCountQuery();
  const eventCountQuery = useQuery({
    queryKey: homepagePredictWorldCupEventCountKeys.all(eventCountQueryParams),
    queryFn: fetchHomepagePredictWorldCupEventCount,
    staleTime: HOMEPAGE_PREDICT_WORLD_CUP_EVENT_COUNT_STALE_TIME,
    enabled,
  });
  const refetch = async () => {
    await eventCountQuery.refetch();
  };

  return {
    eventCount: eventCountQuery.data,
    isFetching: eventCountQuery.isLoading,
    refetch,
  };
}

/**
 * Homepage discovery: loads World Cup markets using the same ALL-tab query path
 * as the dedicated World Cup screen.
 */
export function useHomepagePredictWorldCupMarkets({
  enabled,
}: UseHomepagePredictWorldCupMarketsArgs): UseHomepagePredictWorldCupMarketsResult {
  const config = useSelector(selectPredictWorldCupConfig);

  return usePredictWorldCupMarkets({
    tabKey: PREDICT_WORLD_CUP_TAB_KEYS.ALL,
    config,
    enabled,
  });
}

export type UseHomepagePredictWorldCupMarketsResult =
  UsePredictMarketDataResult;
