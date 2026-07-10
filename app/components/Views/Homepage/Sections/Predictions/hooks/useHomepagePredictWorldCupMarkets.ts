import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { usePredictWorldCupMarkets } from '../../../../../UI/Predict/hooks/usePredictWorldCup';
import type { UsePredictMarketDataResult } from '../../../../../UI/Predict/hooks/usePredictMarketData';
import { PREDICT_WORLD_CUP_TAB_KEYS } from '../../../../../UI/Predict/constants/worldCupTabs';
import { selectPredictWorldCupConfig } from '../../../../../UI/Predict/selectors/featureFlags';
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

const buildHomepagePredictWorldCupEventCountQuery = (
  tagSlug: string,
): string => {
  const queryParams = new URLSearchParams();
  queryParams.set('tag_slug', tagSlug);
  queryParams.set(
    'limit',
    String(HOMEPAGE_PREDICT_WORLD_CUP_EVENT_COUNT_LIMIT),
  );
  queryParams.set('active', 'true');
  queryParams.set('closed', 'false');
  queryParams.set('archived', 'false');

  return queryParams.toString();
};

const fetchHomepagePredictWorldCupEventCount = async (
  queryParams: string,
): Promise<number | null> => {
  const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();

  const response = await fetch(
    `${GAMMA_API_ENDPOINT}/events/pagination?${queryParams}`,
  );

  if (!response.ok) {
    throw new Error('Failed to get homepage World Cup event count');
  }

  const data = await response.json();
  const totalResults = data?.pagination?.totalResults;

  return typeof totalResults === 'number' ? totalResults : null;
};

/**
 * Homepage discovery: loads World Cup markets using the same ALL-tab query path
 * as the dedicated World Cup screen, but keeps its event-count query private to
 * this hook so `/events/pagination` is only requested by the homepage row.
 */
export function useHomepagePredictWorldCupEventCount({
  enabled,
}: UseHomepagePredictWorldCupMarketsArgs): UseHomepagePredictWorldCupEventCountResult {
  const config = useSelector(selectPredictWorldCupConfig);
  const eventCountQueryParams = buildHomepagePredictWorldCupEventCountQuery(
    config.tagSlug,
  );
  const eventCountQuery = useQuery({
    queryKey: homepagePredictWorldCupEventCountKeys.all(eventCountQueryParams),
    queryFn: () =>
      fetchHomepagePredictWorldCupEventCount(eventCountQueryParams),
    staleTime: HOMEPAGE_PREDICT_WORLD_CUP_EVENT_COUNT_STALE_TIME,
    enabled,
  });
  const refetch = async () => {
    await eventCountQuery.refetch();
  };

  return {
    eventCount: eventCountQuery.data ?? undefined,
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

/**
 * Homepage discovery: loads live World Cup games using the same LIVE-tab query
 * path as the dedicated World Cup screen.
 */
export function useHomepagePredictLiveWorldCupMarkets({
  enabled,
}: UseHomepagePredictWorldCupMarketsArgs): UseHomepagePredictWorldCupMarketsResult {
  const config = useSelector(selectPredictWorldCupConfig);

  return usePredictWorldCupMarkets({
    tabKey: PREDICT_WORLD_CUP_TAB_KEYS.LIVE,
    config,
    enabled,
  });
}

export type UseHomepagePredictWorldCupMarketsResult =
  UsePredictMarketDataResult;
