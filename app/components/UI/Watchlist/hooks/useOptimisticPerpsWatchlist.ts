import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { UnifiedWatchlistItem, UnifiedWatchlistPerp } from '../types';
import { createUnifiedWatchlistPerp } from '../utils';

const normalizePerpSymbol = (symbol: string): string => symbol.toLowerCase();

/** `PerpsMarketData` = optimistic add, `null` = optimistic removal. */
type OptimisticPerpEntry = PerpsMarketData | null;

const deleteFromMap = <Key, Value>(
  current: Map<Key, Value>,
  key: Key,
): Map<Key, Value> => {
  if (!current.has(key)) {
    return current;
  }
  const next = new Map(current);
  next.delete(key);
  return next;
};

interface UseOptimisticPerpsWatchlistOptions {
  orderedItems: readonly UnifiedWatchlistItem[];
  persistedPerps: readonly UnifiedWatchlistPerp[];
  perpsMembershipSymbols: readonly string[];
  addPerpToWatchlist: (symbol: string) => Promise<boolean>;
  removePerpFromWatchlist: (symbol: string) => Promise<boolean>;
  onPerpAdded?: (symbol: string) => void;
}

export const useOptimisticPerpsWatchlist = ({
  orderedItems,
  persistedPerps,
  perpsMembershipSymbols,
  addPerpToWatchlist,
  removePerpFromWatchlist,
  onPerpAdded,
}: UseOptimisticPerpsWatchlistOptions) => {
  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Map<string, OptimisticPerpEntry>
  >(() => new Map());
  const mutationSeqRef = useRef<Map<string, number>>(new Map());

  const persistedSymbols = useMemo(
    () =>
      new Set(persistedPerps.map((item) => normalizePerpSymbol(item.symbol))),
    [persistedPerps],
  );

  useEffect(() => {
    setOptimisticOverrides((current) => {
      let next = current;
      current.forEach((entry, symbol) => {
        const isPersisted = persistedSymbols.has(symbol);
        if (
          (entry !== null && isPersisted) ||
          (entry === null && !isPersisted)
        ) {
          next = deleteFromMap(next, symbol);
        }
      });
      return next;
    });
  }, [persistedSymbols]);

  const displayOrderedItems = useMemo(() => {
    const existingPerpSymbols = new Set<string>();
    const filtered = orderedItems.filter((item) => {
      if (item.kind === 'token') {
        return true;
      }
      const symbol = normalizePerpSymbol(item.symbol);
      existingPerpSymbols.add(symbol);
      return optimisticOverrides.get(symbol) !== null;
    });

    optimisticOverrides.forEach((market, symbol) => {
      if (market !== null && !existingPerpSymbols.has(symbol)) {
        filtered.push(createUnifiedWatchlistPerp(market));
      }
    });
    return filtered;
  }, [optimisticOverrides, orderedItems]);

  const watchlistedPerpSymbols = useMemo(() => {
    const symbols = perpsMembershipSymbols.filter(
      (symbol) => optimisticOverrides.get(normalizePerpSymbol(symbol)) !== null,
    );
    optimisticOverrides.forEach((market) => {
      if (market !== null) {
        symbols.push(market.symbol);
      }
    });
    return symbols;
  }, [optimisticOverrides, perpsMembershipSymbols]);

  const beginMutation = useCallback(
    (symbol: string, nextEntry: OptimisticPerpEntry): (() => void) => {
      const seq = (mutationSeqRef.current.get(symbol) ?? 0) + 1;
      mutationSeqRef.current.set(symbol, seq);
      setOptimisticOverrides((current) => {
        const next = new Map(current);
        next.set(symbol, nextEntry);
        return next;
      });
      return () => {
        if (mutationSeqRef.current.get(symbol) === seq) {
          setOptimisticOverrides((current) => deleteFromMap(current, symbol));
        }
      };
    },
    [],
  );

  const addPerp = useCallback(
    (market: PerpsMarketData) => {
      const rollbackIfLatest = beginMutation(
        normalizePerpSymbol(market.symbol),
        market,
      );
      addPerpToWatchlist(market.symbol)
        .then((wasAdded) => {
          if (wasAdded) {
            onPerpAdded?.(market.symbol);
            return;
          }
          rollbackIfLatest();
        })
        .catch(rollbackIfLatest);
    },
    [addPerpToWatchlist, beginMutation, onPerpAdded],
  );

  const removePerp = useCallback(
    (rawSymbol: string) => {
      const rollbackIfLatest = beginMutation(
        normalizePerpSymbol(rawSymbol),
        null,
      );
      removePerpFromWatchlist(rawSymbol)
        .then((wasRemoved) => {
          if (!wasRemoved) {
            rollbackIfLatest();
          }
        })
        .catch(rollbackIfLatest);
    },
    [beginMutation, removePerpFromWatchlist],
  );

  return {
    displayOrderedItems,
    watchlistedPerpSymbols,
    hasPendingPerpMutations: optimisticOverrides.size > 0,
    addPerp,
    removePerp,
  };
};
