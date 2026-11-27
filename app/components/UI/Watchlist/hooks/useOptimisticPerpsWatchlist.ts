import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { UnifiedWatchlistItem, UnifiedWatchlistPerp } from '../types';
import { createUnifiedWatchlistPerp } from '../utils';

const normalizePerpSymbol = (symbol: string): string => symbol.toLowerCase();

/** `PerpsMarketData` = optimistic add, `null` = optimistic removal. */
type OptimisticPerpEntry = PerpsMarketData | null;

export type OptimisticPerpsWatchlistAction = 'add' | 'remove';

const EMPTY_OVERRIDES = new Map<string, OptimisticPerpEntry>();

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
  accountGroupId?: string | null;
  orderedItems: readonly UnifiedWatchlistItem[];
  persistedPerps: readonly UnifiedWatchlistPerp[];
  perpsMembershipSymbols: readonly string[];
  addPerpToWatchlist: (symbol: string) => Promise<boolean>;
  removePerpFromWatchlist: (symbol: string) => Promise<boolean>;
  onPerpAdded?: (symbol: string) => void;
  onMutationError?: (
    action: OptimisticPerpsWatchlistAction,
    symbol: string,
  ) => void;
}

export const useOptimisticPerpsWatchlist = ({
  accountGroupId,
  orderedItems,
  persistedPerps,
  perpsMembershipSymbols,
  addPerpToWatchlist,
  removePerpFromWatchlist,
  onPerpAdded,
  onMutationError,
}: UseOptimisticPerpsWatchlistOptions) => {
  const [overrideState, setOverrideState] = useState<{
    accountGroupId: string | null | undefined;
    overrides: Map<string, OptimisticPerpEntry>;
  }>(() => ({
    accountGroupId,
    overrides: new Map(),
  }));
  const mutationSeqRef = useRef<Map<string, number>>(new Map());
  const prevAccountGroupIdRef = useRef(accountGroupId);
  const latestAccountGroupIdRef = useRef(accountGroupId);
  latestAccountGroupIdRef.current = accountGroupId;
  const accountGroupGenRef = useRef(0);

  const optimisticOverrides =
    overrideState.accountGroupId === accountGroupId
      ? overrideState.overrides
      : EMPTY_OVERRIDES;

  const updateOverrides = useCallback(
    (
      updater: (
        current: Map<string, OptimisticPerpEntry>,
      ) => Map<string, OptimisticPerpEntry>,
    ) => {
      setOverrideState((current) => {
        const next = updater(current.overrides);
        return next === current.overrides
          ? current
          : { accountGroupId: current.accountGroupId, overrides: next };
      });
    },
    [],
  );

  useEffect(() => {
    if (prevAccountGroupIdRef.current === accountGroupId) {
      return;
    }
    prevAccountGroupIdRef.current = accountGroupId;
    accountGroupGenRef.current += 1;
    mutationSeqRef.current.clear();
    setOverrideState({
      accountGroupId,
      overrides: new Map(),
    });
  }, [accountGroupId]);

  const persistedSymbols = useMemo(
    () =>
      new Set(persistedPerps.map((item) => normalizePerpSymbol(item.symbol))),
    [persistedPerps],
  );

  useEffect(() => {
    updateOverrides((current) => {
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
  }, [persistedSymbols, updateOverrides]);

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
    (
      symbol: string,
      nextEntry: OptimisticPerpEntry,
    ): { isCurrent: () => boolean; rollbackIfCurrent: () => boolean } => {
      const capturedAccountGroupId = latestAccountGroupIdRef.current;
      const capturedGeneration = accountGroupGenRef.current;
      const seq = (mutationSeqRef.current.get(symbol) ?? 0) + 1;
      mutationSeqRef.current.set(symbol, seq);
      updateOverrides((current) => {
        const next = new Map(current);
        next.set(symbol, nextEntry);
        return next;
      });

      const isCurrent = (): boolean =>
        accountGroupGenRef.current === capturedGeneration &&
        latestAccountGroupIdRef.current === capturedAccountGroupId &&
        mutationSeqRef.current.get(symbol) === seq;

      const rollbackIfCurrent = (): boolean => {
        if (!isCurrent()) {
          return false;
        }
        updateOverrides((current) => deleteFromMap(current, symbol));
        return true;
      };

      return { isCurrent, rollbackIfCurrent };
    },
    [updateOverrides],
  );

  const addPerp = useCallback(
    (market: PerpsMarketData) => {
      const { isCurrent, rollbackIfCurrent } = beginMutation(
        normalizePerpSymbol(market.symbol),
        market,
      );
      const handleError = (): void => {
        if (rollbackIfCurrent()) {
          onMutationError?.('add', market.symbol);
        }
      };
      addPerpToWatchlist(market.symbol)
        .then((wasAdded) => {
          if (wasAdded) {
            if (isCurrent()) {
              onPerpAdded?.(market.symbol);
            }
            return;
          }
          handleError();
        })
        .catch(handleError);
    },
    [addPerpToWatchlist, beginMutation, onMutationError, onPerpAdded],
  );

  const removePerp = useCallback(
    (rawSymbol: string) => {
      const { rollbackIfCurrent } = beginMutation(
        normalizePerpSymbol(rawSymbol),
        null,
      );
      const handleError = (): void => {
        if (rollbackIfCurrent()) {
          onMutationError?.('remove', rawSymbol);
        }
      };
      removePerpFromWatchlist(rawSymbol)
        .then((wasRemoved) => {
          if (!wasRemoved) {
            handleError();
          }
        })
        .catch(handleError);
    },
    [beginMutation, onMutationError, removePerpFromWatchlist],
  );

  return {
    displayOrderedItems,
    watchlistedPerpSymbols,
    hasPendingPerpMutations: optimisticOverrides.size > 0,
    addPerp,
    removePerp,
  };
};
