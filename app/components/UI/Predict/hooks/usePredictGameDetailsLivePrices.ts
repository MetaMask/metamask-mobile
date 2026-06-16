import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { PriceQuery, PriceResult, PriceUpdate } from '../types';
import { useLiveMarketPrices } from './useLiveMarketPrices';

export interface UsePredictGameDetailsLivePricesOptions {
  enabled?: boolean;
}

export interface UsePredictGameDetailsLivePricesResult {
  prices: Map<string, PriceUpdate>;
  getPrice: (tokenId: string) => PriceUpdate | undefined;
  isConnected: boolean;
  priceVersion: number;
}

const normalizePriceResult = (result: PriceResult): PriceUpdate => ({
  tokenId: result.outcomeTokenId,
  price: result.entry.buy,
  bestBid: result.entry.sell,
  bestAsk: result.entry.buy,
});

const getNormalizedQueries = (queries: PriceQuery[]): PriceQuery[] => {
  const queriesByTokenId = new Map<string, PriceQuery>();

  queries.forEach((query) => {
    if (!query.outcomeTokenId || queriesByTokenId.has(query.outcomeTokenId)) {
      return;
    }

    queriesByTokenId.set(query.outcomeTokenId, query);
  });

  return [...queriesByTokenId.values()].sort((a, b) => {
    const tokenCompare = a.outcomeTokenId.localeCompare(b.outcomeTokenId);
    if (tokenCompare !== 0) {
      return tokenCompare;
    }

    const marketCompare = a.marketId.localeCompare(b.marketId);
    if (marketCompare !== 0) {
      return marketCompare;
    }

    return a.outcomeId.localeCompare(b.outcomeId);
  });
};

/**
 * Owns game-detail live pricing orchestration: REST warmup for newly visible
 * queries plus WebSocket updates from the shared live market price hook.
 */
export const usePredictGameDetailsLivePrices = (
  queries: PriceQuery[],
  options: UsePredictGameDetailsLivePricesOptions = {},
): UsePredictGameDetailsLivePricesResult => {
  const { enabled = true } = options;
  const [warmupPrices, setWarmupPrices] = useState<Map<string, PriceUpdate>>(
    () => new Map(),
  );
  const [priceVersion, setPriceVersion] = useState(0);

  const activeTokenIdsRef = useRef<Set<string>>(new Set());
  const activeTokenEpochsRef = useRef<Map<string, number>>(new Map());
  const isMountedRef = useRef(true);
  const tokenEpochRef = useRef(0);
  const websocketGenerationRef = useRef(0);
  const websocketTokenGenerationsRef = useRef<Map<string, number>>(new Map());

  const normalizedQueries = useMemo(
    () => getNormalizedQueries(queries),
    [queries],
  );
  const queriesKey = useMemo(
    () => JSON.stringify(normalizedQueries),
    [normalizedQueries],
  );
  const currentTokenIds = useMemo(
    () => normalizedQueries.map((query) => query.outcomeTokenId),
    [normalizedQueries],
  );
  const livePricesEnabled = enabled && currentTokenIds.length > 0;

  useEffect(() => {
    isMountedRef.current = true;
    const activeTokenEpochs = activeTokenEpochsRef.current;

    return () => {
      isMountedRef.current = false;
      activeTokenIdsRef.current = new Set();
      activeTokenEpochs.clear();
    };
  }, []);

  const commitWarmupPriceUpdates = useCallback((updates: PriceUpdate[]) => {
    if (!isMountedRef.current || updates.length === 0) {
      return;
    }

    setWarmupPrices((previousPrices) => {
      const nextPrices = new Map(previousPrices);
      updates.forEach((update) => {
        nextPrices.set(update.tokenId, update);
      });
      return nextPrices;
    });
    setPriceVersion((previousVersion) => previousVersion + 1);
  }, []);

  const fetchWarmupPrices = useCallback(
    async (
      newlyVisibleQueries: PriceQuery[],
      tokenEpochsAtRequest: Map<string, number>,
      websocketGenerationAtRequest: number,
    ) => {
      if (newlyVisibleQueries.length === 0) {
        return;
      }

      try {
        const response = await Engine.context.PredictController.getPrices({
          queries: newlyVisibleQueries,
        });

        const updates = response.results
          .filter((result) => {
            const tokenId = result.outcomeTokenId;
            const currentTokenEpoch = activeTokenEpochsRef.current.get(tokenId);
            const requestTokenEpoch = tokenEpochsAtRequest.get(tokenId);
            const websocketTokenGeneration =
              websocketTokenGenerationsRef.current.get(tokenId) ?? 0;

            return (
              activeTokenIdsRef.current.has(tokenId) &&
              currentTokenEpoch === requestTokenEpoch &&
              websocketTokenGeneration <= websocketGenerationAtRequest
            );
          })
          .map(normalizePriceResult);

        commitWarmupPriceUpdates(updates);
      } catch (error) {
        DevLogger.log(
          'usePredictGameDetailsLivePrices: Error fetching prices',
          error,
        );
      }
    },
    [commitWarmupPriceUpdates],
  );

  const handleLivePriceUpdates = useCallback((updates: PriceUpdate[]) => {
    const activeUpdates = updates.filter((update) =>
      activeTokenIdsRef.current.has(update.tokenId),
    );

    if (activeUpdates.length === 0) {
      return;
    }

    websocketGenerationRef.current += 1;
    activeUpdates.forEach((update) => {
      websocketTokenGenerationsRef.current.set(
        update.tokenId,
        websocketGenerationRef.current,
      );
    });

    setPriceVersion((previousVersion) => previousVersion + 1);
  }, []);

  const {
    prices: livePrices,
    getPrice: getLivePrice,
    isConnected,
  } = useLiveMarketPrices(currentTokenIds, {
    enabled: livePricesEnabled,
    onPriceUpdates: handleLivePriceUpdates,
  });

  const prices = useMemo(() => {
    const activeTokenIds = new Set(currentTokenIds);
    const nextPrices = new Map<string, PriceUpdate>();

    warmupPrices.forEach((price, tokenId) => {
      if (activeTokenIds.has(tokenId)) {
        nextPrices.set(tokenId, price);
      }
    });
    livePrices.forEach((price, tokenId) => {
      if (activeTokenIds.has(tokenId)) {
        nextPrices.set(tokenId, price);
      }
    });

    return nextPrices;
  }, [currentTokenIds, livePrices, warmupPrices]);

  useEffect(() => {
    const currentTokenIdSet = new Set(currentTokenIds);
    const previousTokenIdSet = activeTokenIdsRef.current;

    setWarmupPrices((previousPrices) => {
      const nextPrices = new Map<string, PriceUpdate>();
      previousPrices.forEach((price, tokenId) => {
        if (currentTokenIdSet.has(tokenId)) {
          nextPrices.set(tokenId, price);
        }
      });
      return nextPrices;
    });

    previousTokenIdSet.forEach((tokenId) => {
      if (!currentTokenIdSet.has(tokenId)) {
        activeTokenEpochsRef.current.delete(tokenId);
        websocketTokenGenerationsRef.current.delete(tokenId);
      }
    });

    if (!enabled || currentTokenIds.length === 0) {
      activeTokenIdsRef.current = new Set();
      return;
    }

    const newlyVisibleQueries = normalizedQueries.filter(
      (query) => !previousTokenIdSet.has(query.outcomeTokenId),
    );
    const tokenEpochsAtRequest = new Map<string, number>();

    newlyVisibleQueries.forEach((query) => {
      tokenEpochRef.current += 1;
      activeTokenEpochsRef.current.set(
        query.outcomeTokenId,
        tokenEpochRef.current,
      );
      tokenEpochsAtRequest.set(query.outcomeTokenId, tokenEpochRef.current);
    });

    activeTokenIdsRef.current = currentTokenIdSet;

    fetchWarmupPrices(
      newlyVisibleQueries,
      tokenEpochsAtRequest,
      websocketGenerationRef.current,
    );
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetchWarmupPrices, queriesKey]);

  const getPrice = useCallback(
    (tokenId: string): PriceUpdate | undefined =>
      getLivePrice(tokenId) ?? prices.get(tokenId),
    [getLivePrice, prices],
  );

  return {
    prices,
    getPrice,
    isConnected,
    priceVersion,
  };
};
