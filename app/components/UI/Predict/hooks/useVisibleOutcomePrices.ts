import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveMarketPrices } from './useLiveMarketPrices';
import { usePredictPrices } from './usePredictPrices';
import type {
  GetPriceResponse,
  PredictOutcomeToken,
  PriceQuery,
} from '../types';
import { getPredictBuyPrice } from '../utils/prices';

const EMPTY_PRICE_RESPONSE: GetPriceResponse = {
  providerId: '',
  results: [],
};

const EMPTY_TOKEN_IDS: string[] = [];
const visibleOutcomePriceCache = new Map<string, GetPriceResponse>();

const getQueriesKey = (queries: PriceQuery[]) =>
  JSON.stringify(
    [...queries].sort((a, b) =>
      a.outcomeTokenId.localeCompare(b.outcomeTokenId),
    ),
  );

export const __resetVisibleOutcomePriceCacheForTest = () => {
  visibleOutcomePriceCache.clear();
};

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
  const queriesKey = useMemo(() => getQueriesKey(queries), [queries]);
  const [restPrices, setRestPrices] = useState<GetPriceResponse>(
    () => visibleOutcomePriceCache.get(queriesKey) ?? EMPTY_PRICE_RESPONSE,
  );

  useEffect(() => {
    setRestPrices(
      visibleOutcomePriceCache.get(queriesKey) ?? EMPTY_PRICE_RESPONSE,
    );
  }, [queriesKey]);

  const shouldEnable = enabled && visible && tokens.length > 0;
  const tokenIds = shouldEnable
    ? tokens.map((token) => token.id)
    : EMPTY_TOKEN_IDS;
  const shouldFetchRestPrices =
    shouldEnable &&
    queries.length > 0 &&
    !visibleOutcomePriceCache.has(queriesKey) &&
    restPrices.results.length === 0;

  const { prices: fetchedPrices } = usePredictPrices({
    queries,
    enabled: shouldFetchRestPrices,
  });

  useEffect(() => {
    if (fetchedPrices.results.length === 0) {
      return;
    }

    visibleOutcomePriceCache.set(queriesKey, fetchedPrices);
    setRestPrices(fetchedPrices);
  }, [fetchedPrices, queriesKey]);

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
