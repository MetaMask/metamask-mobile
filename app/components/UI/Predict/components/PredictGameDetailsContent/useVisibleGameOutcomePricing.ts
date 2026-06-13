import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useVisibleOutcomePrices } from '../../hooks/useVisibleOutcomePrices';
import { PREDICT_FLASH_LIST_VIEWABILITY_CONFIG } from '../../constants/viewability';
import type { PredictOutcomeToken, PriceQuery } from '../../types';
import { areSetsEqual } from '../../utils/sets';
import {
  resolveCardPricing,
  type GetTokenPrice,
  type OutcomeCardModel,
} from './outcomeCardModel';

const VISIBILITY_DEBOUNCE_MS = 200;

interface UseVisibleGameOutcomePricingParams {
  cardModels: OutcomeCardModel[];
  enabled?: boolean;
  getCardVisibleKey?: (cardModel: OutcomeCardModel) => string;
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
  enabled = true,
  getCardVisibleKey = (cardModel) => cardModel.key,
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
    if (enabled) {
      return;
    }

    setRawVisibleCardKeys((prevVisibleCardKeys) =>
      prevVisibleCardKeys.size === 0 ? prevVisibleCardKeys : new Set(),
    );
  }, [enabled]);

  const effectiveVisibleCardKeys = visibleCardKeys ?? debouncedVisibleCardKeys;

  const visiblePricingScopes = useMemo(() => {
    if (!enabled) {
      return [];
    }

    return cardModels
      .filter((cardModel) =>
        effectiveVisibleCardKeys.has(getCardVisibleKey(cardModel)),
      )
      .map((cardModel) =>
        resolveCardPricing(cardModel, selectedLineIndices[cardModel.key]),
      );
  }, [
    cardModels,
    effectiveVisibleCardKeys,
    enabled,
    getCardVisibleKey,
    selectedLineIndices,
  ]);

  const visiblePricing = useMemo(() => {
    const queriesByTokenId = new Map<string, PriceQuery>();
    const tokensById = new Map<string, PredictOutcomeToken>();

    visiblePricingScopes.forEach((scope) => {
      scope.tokens.forEach((token) => {
        tokensById.set(token.id, token);
      });

      scope.queries.forEach((query) => {
        queriesByTokenId.set(query.outcomeTokenId, query);
      });
    });

    return {
      queries: [...queriesByTokenId.values()],
      tokens: [...tokensById.values()],
    };
  }, [visiblePricingScopes]);

  const { getTokenPrice } = useVisibleOutcomePrices({
    queries: visiblePricing.queries,
    tokens: visiblePricing.tokens,
    visible: enabled && visiblePricing.tokens.length > 0,
    enabled,
  });

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
    viewabilityConfig: PREDICT_FLASH_LIST_VIEWABILITY_CONFIG,
  };
};
