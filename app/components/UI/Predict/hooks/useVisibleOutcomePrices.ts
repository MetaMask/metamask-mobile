import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveMarketPrices } from './useLiveMarketPrices';
import { usePredictPrices } from './usePredictPrices';
import type {
  GetPriceResponse,
  PredictOutcomeToken,
  PriceQuery,
  PriceResult,
} from '../types';
import { getPredictBuyPrice } from '../utils/prices';

const EMPTY_TOKEN_IDS: string[] = [];
const visibleOutcomePriceCache = new Map<string, PriceResult>();
const requestedOutcomeTokenIds = new Set<string>();

export const __resetVisibleOutcomePriceCacheForTest = () => {
  visibleOutcomePriceCache.clear();
  requestedOutcomeTokenIds.clear();
};

const getCachedRestPrices = (queries: PriceQuery[]): GetPriceResponse => ({
  providerId: '',
  results: queries
    .map((query) => visibleOutcomePriceCache.get(query.outcomeTokenId))
    .filter((result): result is PriceResult => Boolean(result)),
});

interface UseVisibleOutcomePricesParams {
  queries: PriceQuery[];
  tokens: PredictOutcomeToken[];
  visible: boolean;
  enabled?: boolean;
}

interface UseVisibleOutcomePricesResult {
  getTokenPrice: (token: PredictOutcomeToken) => number;
}

export const useVisibleOutcomePrices = ({
  queries,
  tokens,
  visible,
  enabled = true,
}: UseVisibleOutcomePricesParams): UseVisibleOutcomePricesResult => {
  const [restPrices, setRestPrices] = useState<GetPriceResponse>(() =>
    getCachedRestPrices(queries),
  );

  useEffect(() => {
    setRestPrices(getCachedRestPrices(queries));
  }, [queries]);

  const shouldEnable = enabled && visible && tokens.length > 0;
  const tokenIds = shouldEnable
    ? tokens.map((token) => token.id)
    : EMPTY_TOKEN_IDS;
  const uncachedQueries = useMemo(
    () =>
      shouldEnable
        ? queries.filter(
            (query) =>
              !visibleOutcomePriceCache.has(query.outcomeTokenId) &&
              !requestedOutcomeTokenIds.has(query.outcomeTokenId),
          )
        : [],
    [queries, shouldEnable],
  );
  const shouldFetchRestPrices = shouldEnable && uncachedQueries.length > 0;

  const { prices: fetchedPrices } = usePredictPrices({
    queries: uncachedQueries,
    enabled: shouldFetchRestPrices,
  });

  useEffect(() => {
    if (!shouldFetchRestPrices) {
      return;
    }

    uncachedQueries.forEach((query) => {
      requestedOutcomeTokenIds.add(query.outcomeTokenId);
    });
  }, [shouldFetchRestPrices, uncachedQueries]);

  useEffect(() => {
    if (fetchedPrices.results.length === 0) {
      return;
    }

    fetchedPrices.results.forEach((result) => {
      visibleOutcomePriceCache.set(result.outcomeTokenId, result);
    });
    setRestPrices(getCachedRestPrices(queries));
  }, [fetchedPrices, queries]);

  const { getPrice: getLivePrice } = useLiveMarketPrices(tokenIds, {
    enabled: shouldEnable,
  });

  const effectiveRestPrices =
    restPrices.results.length > 0 ? restPrices : fetchedPrices;

  const getTokenPrice = useCallback(
    (token: PredictOutcomeToken) =>
      getPredictBuyPrice(token, getLivePrice(token.id), effectiveRestPrices) ??
      token.price,
    [effectiveRestPrices, getLivePrice],
  );

  return {
    getTokenPrice,
  };
};
