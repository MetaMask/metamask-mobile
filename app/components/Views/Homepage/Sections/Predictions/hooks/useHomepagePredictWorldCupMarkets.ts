import { useQuery } from '@tanstack/react-query';
import {
  usePredictMarketData,
  type UsePredictMarketDataResult,
} from '../../../../../UI/Predict/hooks/usePredictMarketData';
import type { PredictMarket } from '../../../../../UI/Predict/types';
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
const HOMEPAGE_PREDICT_WORLD_CUP_TAG_SLUG = 'fifa-world-cup';
const HOMEPAGE_PREDICT_WORLD_CUP_GAMES_TAG_ID = '100639';

const buildHomepagePredictWorldCupMarketsQuery = ({
  live = false,
}: {
  live?: boolean;
} = {}): string => {
  const queryParams = new URLSearchParams({
    active: 'true',
    archived: 'false',
    closed: 'false',
    tag_slug: HOMEPAGE_PREDICT_WORLD_CUP_TAG_SLUG,
  });

  if (live) {
    queryParams.set('tag_id', HOMEPAGE_PREDICT_WORLD_CUP_GAMES_TAG_ID);
    queryParams.set('live', 'true');
    queryParams.set('order', 'startDate');
  } else {
    queryParams.set('order', 'volume24hr');
    queryParams.set('ascending', 'false');
  }

  return queryParams.toString();
};

const normalizeHomepageWorldCupMarkets = (
  markets: PredictMarket[],
): PredictMarket[] =>
  markets.map((market) =>
    market.category === 'sports' ? market : { ...market, category: 'sports' },
  );

const HOMEPAGE_PREDICT_WORLD_CUP_MARKETS_QUERY =
  buildHomepagePredictWorldCupMarketsQuery();
const HOMEPAGE_PREDICT_LIVE_WORLD_CUP_MARKETS_QUERY =
  buildHomepagePredictWorldCupMarketsQuery({ live: true });

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
  const eventCountQueryParams = buildHomepagePredictWorldCupEventCountQuery(
    HOMEPAGE_PREDICT_WORLD_CUP_TAG_SLUG,
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
 * Homepage-owned World Cup discovery query. It deliberately uses the legacy
 * exact-query path so the temporary dedicated Predict screen can be retired
 * without changing this homepage surface.
 */
export function useHomepagePredictWorldCupMarkets({
  enabled,
}: UseHomepagePredictWorldCupMarketsArgs): UseHomepagePredictWorldCupMarketsResult {
  return usePredictMarketData({
    category: 'hot',
    customQueryParams: HOMEPAGE_PREDICT_WORLD_CUP_MARKETS_QUERY,
    refine: normalizeHomepageWorldCupMarkets,
    enabled,
  });
}

/**
 * Homepage-owned live World Cup discovery query.
 */
export function useHomepagePredictLiveWorldCupMarkets({
  enabled,
}: UseHomepagePredictWorldCupMarketsArgs): UseHomepagePredictWorldCupMarketsResult {
  return usePredictMarketData({
    category: 'hot',
    customQueryParams: HOMEPAGE_PREDICT_LIVE_WORLD_CUP_MARKETS_QUERY,
    refine: normalizeHomepageWorldCupMarkets,
    enabled,
  });
}

export type UseHomepagePredictWorldCupMarketsResult =
  UsePredictMarketDataResult;
