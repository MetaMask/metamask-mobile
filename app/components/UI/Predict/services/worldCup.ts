import Engine from '../../../../core/Engine';
import type { PredictMarket } from '../types';

export const PREDICT_WORLD_CUP_PAGE_SIZE = 20;
export const PREDICT_WORLD_CUP_AVAILABILITY_LIMIT = 1;

interface FetchPredictWorldCupMarketsParams {
  queryParams: string;
  limit?: number;
  afterCursor?: string | null;
  sortByStartTime?: boolean;
}

const getPredictController = () => {
  const controller = Engine.context.PredictController;

  if (!controller) {
    throw new Error('PredictController not available');
  }

  return controller;
};

const getMarketStartTimestamp = (market: PredictMarket): number => {
  const timestamp = Date.parse(market.game?.startTime ?? market.endDate ?? '');
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

/**
 * Returns World Cup markets ordered by match start time when available.
 * Non-game markets sort after dated game markets and use title as a deterministic tie-breaker.
 */
export const sortPredictWorldCupMarketsByStartTime = (
  markets: PredictMarket[],
): PredictMarket[] =>
  [...markets].sort((firstMarket, secondMarket) => {
    const firstTimestamp = getMarketStartTimestamp(firstMarket);
    const secondTimestamp = getMarketStartTimestamp(secondMarket);

    if (firstTimestamp !== secondTimestamp) {
      return firstTimestamp - secondTimestamp;
    }

    return firstMarket.title.localeCompare(secondMarket.title);
  });

/**
 * Fetches World Cup markets through the Predict controller using raw Polymarket query params.
 */
export const fetchPredictWorldCupMarkets = async ({
  queryParams,
  limit = PREDICT_WORLD_CUP_PAGE_SIZE,
  afterCursor,
  sortByStartTime = false,
}: FetchPredictWorldCupMarketsParams): Promise<PredictMarket[]> => {
  const controller = getPredictController();
  const { markets } = await controller.getMarkets({
    category: 'hot',
    customQueryParams: queryParams,
    limit,
    afterCursor,
  });

  return sortByStartTime
    ? sortPredictWorldCupMarketsByStartTime(markets)
    : markets;
};

/**
 * Performs a lightweight World Cup tab availability check.
 */
export const fetchPredictWorldCupAvailability = async (
  queryParams: string,
): Promise<boolean> => {
  const markets = await fetchPredictWorldCupMarkets({
    queryParams,
    limit: PREDICT_WORLD_CUP_AVAILABILITY_LIMIT,
  });

  return markets.length > 0;
};
