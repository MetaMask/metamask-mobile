import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { PriceQuery, PriceResult, PriceUpdate } from '../types';

export interface UsePredictLivePricesOptions {
  enabled?: boolean;
}

export interface UsePredictLivePricesResult {
  prices: Map<string, PriceUpdate>;
  getPrice: (tokenId: string) => PriceUpdate | undefined;
  isConnected: boolean;
  lastUpdateTime: number | null;
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
 * Subscribes to live Predict market prices for the currently visible price
 * queries, with a one-shot REST warm-up for newly visible tokens.
 */
export const usePredictLivePrices = (
  queries: PriceQuery[],
  options: UsePredictLivePricesOptions = {},
): UsePredictLivePricesResult => {
  const { enabled = true } = options;
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(
    () => new Map(),
  );
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [priceVersion, setPriceVersion] = useState(0);

  const activeTokenIdsRef = useRef<Set<string>>(new Set());
  const activeTokenEpochsRef = useRef<Map<string, number>>(new Map());
  const isMountedRef = useRef(true);
  const priceVersionRef = useRef(0);
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

  useEffect(
    () => () => {
      isMountedRef.current = false;
      activeTokenIdsRef.current = new Set();
      activeTokenEpochsRef.current.clear();
    },
    [],
  );

  const commitPriceUpdates = useCallback((updates: PriceUpdate[]) => {
    if (!isMountedRef.current || updates.length === 0) {
      return;
    }

    const updatedAt = Date.now();

    setPrices((previousPrices) => {
      const nextPrices = new Map(previousPrices);
      updates.forEach((update) => {
        nextPrices.set(update.tokenId, update);
      });
      return nextPrices;
    });
    setLastUpdateTime(updatedAt);
    setPriceVersion((previousVersion) => {
      const nextVersion = previousVersion + 1;
      priceVersionRef.current = nextVersion;
      return nextVersion;
    });
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

        commitPriceUpdates(updates);
      } catch (error) {
        DevLogger.log('usePredictLivePrices: Error fetching prices', error);
      }
    },
    [commitPriceUpdates],
  );

  const handlePriceUpdates = useCallback(
    (updates: PriceUpdate[]) => {
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

      commitPriceUpdates(activeUpdates);
    },
    [commitPriceUpdates],
  );

  useEffect(() => {
    const currentTokenIds = normalizedQueries.map(
      (query) => query.outcomeTokenId,
    );
    const currentTokenIdSet = new Set(currentTokenIds);
    const previousTokenIdSet = activeTokenIdsRef.current;

    previousTokenIdSet.forEach((tokenId) => {
      if (!currentTokenIdSet.has(tokenId)) {
        activeTokenEpochsRef.current.delete(tokenId);
      }
    });

    if (!enabled || currentTokenIds.length === 0) {
      activeTokenIdsRef.current = new Set();
      setIsConnected(false);
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

    const { PredictController } = Engine.context;
    const unsubscribe = PredictController.subscribeToMarketPrices(
      currentTokenIds,
      handlePriceUpdates,
    );

    const checkConnection = () => {
      if (!isMountedRef.current) {
        return;
      }

      const status = PredictController.getConnectionStatus();
      setIsConnected(status.marketConnected);
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 1000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetchWarmupPrices, handlePriceUpdates, queriesKey]);

  const getPrice = useCallback(
    (tokenId: string): PriceUpdate | undefined => prices.get(tokenId),
    [prices],
  );

  return {
    prices,
    getPrice,
    isConnected,
    lastUpdateTime,
    priceVersion,
  };
};
