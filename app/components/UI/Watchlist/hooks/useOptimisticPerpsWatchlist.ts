import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { UnifiedWatchlistItem, UnifiedWatchlistPerp } from '../types';
import { createUnifiedWatchlistPerp } from '../utils';

const normalizePerpSymbol = (symbol: string): string => symbol.toLowerCase();

const deleteFromMap = <K, V>(current: Map<K, V>, key: K): Map<K, V> => {
  if (!current.has(key)) {
    return current;
  }
  const next = new Map(current);
  next.delete(key);
  return next;
};

const deleteFromSet = <T>(current: Set<T>, value: T): Set<T> => {
  if (!current.has(value)) {
    return current;
  }
  const next = new Set(current);
  next.delete(value);
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
  const [optimisticAdds, setOptimisticAdds] = useState<
    Map<string, PerpsMarketData>
  >(() => new Map());
  const [optimisticRemovals, setOptimisticRemovals] = useState<Set<string>>(
    () => new Set(),
  );

  const persistedSymbols = useMemo(
    () =>
      new Set(persistedPerps.map((item) => normalizePerpSymbol(item.symbol))),
    [persistedPerps],
  );

  useEffect(() => {
    setOptimisticAdds((current) => {
      let next = current;
      current.forEach((_market, symbol) => {
        if (persistedSymbols.has(symbol)) {
          next = deleteFromMap(next, symbol);
        }
      });
      return next;
    });
    setOptimisticRemovals((current) => {
      let next = current;
      current.forEach((symbol) => {
        if (!persistedSymbols.has(symbol)) {
          next = deleteFromSet(next, symbol);
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
      return !optimisticRemovals.has(symbol);
    });

    optimisticAdds.forEach((market, symbol) => {
      if (!existingPerpSymbols.has(symbol)) {
        filtered.push(createUnifiedWatchlistPerp(market));
      }
    });
    return filtered;
  }, [optimisticAdds, optimisticRemovals, orderedItems]);

  const watchlistedPerpSymbols = useMemo(
    () => [
      ...perpsMembershipSymbols.filter(
        (symbol) => !optimisticRemovals.has(normalizePerpSymbol(symbol)),
      ),
      ...Array.from(optimisticAdds.values()).map((market) => market.symbol),
    ],
    [optimisticAdds, optimisticRemovals, perpsMembershipSymbols],
  );

  const addPerp = useCallback(
    (market: PerpsMarketData) => {
      const symbol = normalizePerpSymbol(market.symbol);
      setOptimisticRemovals((current) => deleteFromSet(current, symbol));
      setOptimisticAdds((current) => {
        const next = new Map(current);
        next.set(symbol, market);
        return next;
      });

      addPerpToWatchlist(market.symbol)
        .then((wasAdded) => {
          if (wasAdded) {
            onPerpAdded?.(market.symbol);
            return;
          }
          setOptimisticAdds((current) => deleteFromMap(current, symbol));
        })
        .catch(() => {
          setOptimisticAdds((current) => deleteFromMap(current, symbol));
        });
    },
    [addPerpToWatchlist, onPerpAdded],
  );

  const removePerp = useCallback(
    (rawSymbol: string) => {
      const symbol = normalizePerpSymbol(rawSymbol);
      setOptimisticAdds((current) => deleteFromMap(current, symbol));
      setOptimisticRemovals((current) => {
        const next = new Set(current);
        next.add(symbol);
        return next;
      });

      removePerpFromWatchlist(rawSymbol)
        .then((wasRemoved) => {
          if (!wasRemoved) {
            setOptimisticRemovals((current) => deleteFromSet(current, symbol));
          }
        })
        .catch(() => {
          setOptimisticRemovals((current) => deleteFromSet(current, symbol));
        });
    },
    [removePerpFromWatchlist],
  );

  return {
    displayOrderedItems,
    watchlistedPerpSymbols,
    hasPendingPerpMutations:
      optimisticAdds.size > 0 || optimisticRemovals.size > 0,
    addPerp,
    removePerp,
  };
};
