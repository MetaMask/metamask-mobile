import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { usePredictPrices } from '../../hooks/usePredictPrices';
import type {
  GetPriceResponse,
  PredictOutcomeToken,
  PriceQuery,
  PriceResult,
} from '../../types';
import { getPredictBuyPrice } from '../../utils/prices';
import type { GetTokenPrice, OutcomeCardModel } from './PredictGameOutcomeCard';
import { resolveCardPricing } from './usePredictGameOutcomeRows';

const VISIBILITY_DEBOUNCE_MS = 200;

const getQuerySetKey = (queries: PriceQuery[]) =>
  JSON.stringify(
    [...queries]
      .map((query) => query.outcomeTokenId)
      .sort((a, b) => a.localeCompare(b)),
  );

const areSetsEqual = (left: Set<string>, right: Set<string>) => {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
};

interface UseVisibleGameOutcomePricingParams {
  cardModels: OutcomeCardModel[];
  visibleCardKeys?: Set<string>;
  visibilityDebounceMs?: number;
}

interface UseVisibleGameOutcomePricingResult {
  getTokenPrice: GetTokenPrice;
  onSelectedLineIndexChange: (cardKey: string, nextIndex: number) => void;
  onViewableItemsChanged: ({
    viewableItems,
  }: {
    viewableItems: { item?: OutcomeCardModel | null }[];
  }) => void;
  selectedLineIndices: Record<string, number | undefined>;
  viewabilityConfig: {
    itemVisiblePercentThreshold: number;
    minimumViewTime: number;
  };
}

export const useVisibleGameOutcomePricing = ({
  cardModels,
  visibleCardKeys,
  visibilityDebounceMs = VISIBILITY_DEBOUNCE_MS,
}: UseVisibleGameOutcomePricingParams): UseVisibleGameOutcomePricingResult => {
  const [rawVisibleCardKeys, setRawVisibleCardKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedLineIndices, setSelectedLineIndices] = useState<
    Record<string, number | undefined>
  >({});
  const debouncedVisibleCardKeys = useDebouncedValue(
    rawVisibleCardKeys,
    visibilityDebounceMs,
  );
  const fetchedQuerySetKeysRef = useRef<Set<string>>(new Set());
  const [restResultsByTokenId, setRestResultsByTokenId] = useState<
    Record<string, PriceResult>
  >({});
  const [currentFetchBatch, setCurrentFetchBatch] = useState<{
    querySetKeys: string[];
    queries: PriceQuery[];
  } | null>(null);
  const [hasStartedCurrentBatch, setHasStartedCurrentBatch] = useState(false);

  const onViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: { item?: OutcomeCardModel | null }[];
    }) => {
      const nextVisibleCardKeys = new Set(
        viewableItems
          .map((item) => item.item?.key)
          .filter((key): key is string => Boolean(key)),
      );

      setRawVisibleCardKeys((prevVisibleCardKeys) =>
        areSetsEqual(prevVisibleCardKeys, nextVisibleCardKeys)
          ? prevVisibleCardKeys
          : nextVisibleCardKeys,
      );
    },
    [],
  );

  useEffect(() => {
    if (!visibleCardKeys) {
      return;
    }

    setRawVisibleCardKeys((prevVisibleCardKeys) =>
      areSetsEqual(prevVisibleCardKeys, visibleCardKeys)
        ? prevVisibleCardKeys
        : new Set(visibleCardKeys),
    );
  }, [visibleCardKeys]);

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 50,
    }),
    [],
  );

  const visiblePricingScopes = useMemo(
    () =>
      cardModels
        .filter((cardModel) => debouncedVisibleCardKeys.has(cardModel.key))
        .map((cardModel) =>
          resolveCardPricing(cardModel, selectedLineIndices[cardModel.key]),
        ),
    [cardModels, debouncedVisibleCardKeys, selectedLineIndices],
  );

  const activeTokenIds = useMemo(
    () => [...new Set(visiblePricingScopes.flatMap((scope) => scope.tokenIds))],
    [visiblePricingScopes],
  );

  const nextFetchBatch = useMemo(() => {
    if (currentFetchBatch) {
      return null;
    }

    const scopesToFetch = visiblePricingScopes.filter((scope) => {
      if (scope.queries.length === 0) {
        return false;
      }

      return !fetchedQuerySetKeysRef.current.has(getQuerySetKey(scope.queries));
    });

    if (scopesToFetch.length === 0) {
      return null;
    }

    const queriesByTokenId = new Map<string, PriceQuery>();
    const querySetKeys = scopesToFetch.map((scope) =>
      getQuerySetKey(scope.queries),
    );

    scopesToFetch.forEach((scope) => {
      scope.queries.forEach((query) => {
        queriesByTokenId.set(query.outcomeTokenId, query);
      });
    });

    return {
      querySetKeys,
      queries: [...queriesByTokenId.values()],
    };
  }, [currentFetchBatch, visiblePricingScopes]);

  useEffect(() => {
    if (!currentFetchBatch && nextFetchBatch) {
      setCurrentFetchBatch(nextFetchBatch);
      setHasStartedCurrentBatch(false);
    }
  }, [currentFetchBatch, nextFetchBatch]);

  const { prices: fetchedBatchPrices, isFetching: isFetchingBatchPrices } =
    usePredictPrices({
      queries: currentFetchBatch?.queries ?? [],
      enabled: Boolean(currentFetchBatch),
    });

  useEffect(() => {
    if (currentFetchBatch && isFetchingBatchPrices) {
      setHasStartedCurrentBatch(true);
    }
  }, [currentFetchBatch, isFetchingBatchPrices]);

  useEffect(() => {
    if (
      !currentFetchBatch ||
      !hasStartedCurrentBatch ||
      isFetchingBatchPrices
    ) {
      return;
    }

    if (fetchedBatchPrices.results.length > 0) {
      setRestResultsByTokenId((prevResults) => {
        const nextResults = { ...prevResults };
        fetchedBatchPrices.results.forEach((result) => {
          nextResults[result.outcomeTokenId] = result;
        });
        return nextResults;
      });
    }

    currentFetchBatch.querySetKeys.forEach((querySetKey) => {
      fetchedQuerySetKeysRef.current.add(querySetKey);
    });

    setCurrentFetchBatch(null);
    setHasStartedCurrentBatch(false);
  }, [
    currentFetchBatch,
    fetchedBatchPrices,
    hasStartedCurrentBatch,
    isFetchingBatchPrices,
  ]);

  const { getPrice: getLivePrice } = useLiveMarketPrices(activeTokenIds, {
    enabled: activeTokenIds.length > 0,
  });

  const restPrices = useMemo<GetPriceResponse>(
    () => ({
      providerId: fetchedBatchPrices.providerId,
      results: Object.values(restResultsByTokenId),
    }),
    [fetchedBatchPrices.providerId, restResultsByTokenId],
  );

  const getTokenPrice = useCallback<GetTokenPrice>(
    (token: PredictOutcomeToken) =>
      getPredictBuyPrice(token, getLivePrice(token.id), restPrices) ??
      token.price,
    [getLivePrice, restPrices],
  );

  const onSelectedLineIndexChange = useCallback(
    (cardKey: string, nextIndex: number) => {
      setSelectedLineIndices((prev) =>
        prev[cardKey] === nextIndex ? prev : { ...prev, [cardKey]: nextIndex },
      );
    },
    [],
  );

  return {
    getTokenPrice,
    onSelectedLineIndexChange,
    onViewableItemsChanged,
    selectedLineIndices,
    viewabilityConfig,
  };
};
