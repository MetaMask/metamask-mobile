import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PriceQuery } from '../../types';
import {
  getSelectedLineOutcome,
  toPriceQuery,
  type OutcomeCardModel,
} from './outcomeCardModel';

const DEFAULT_SETTLE_DELAY_MS = 200;

export const PREDICT_OUTCOME_VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 50,
  minimumViewTime: 100,
};

interface UsePredictVisibleOutcomesParams<TItem> {
  cardModels: OutcomeCardModel[];
  enabled?: boolean;
  getVisibleCardKey: (item: TItem) => string | undefined;
  getCardVisibleKey?: (cardModel: OutcomeCardModel) => string;
  preserveVisibleCardPositionsOnReset?: boolean;
  resetKey?: string;
  settleDelayMs?: number;
}

export interface UsePredictVisibleOutcomesResult<TItem> {
  onMomentumScrollBegin: () => void;
  onMomentumScrollEnd: () => void;
  onScroll: () => void;
  onScrollBeginDrag: () => void;
  onScrollEndDrag: () => void;
  onSelectedLineIndexChange: (cardKey: string, nextIndex: number) => void;
  onViewableItemsChanged: ({
    viewableItems,
  }: {
    viewableItems: { item?: TItem | null }[];
  }) => void;
  selectedLineIndices: Record<string, number | undefined>;
  viewabilityConfig: typeof PREDICT_OUTCOME_VIEWABILITY_CONFIG;
  visibleCardKeys: Set<string>;
  visiblePriceQueries: PriceQuery[];
  visibleTokenIds: string[];
}

const defaultGetCardVisibleKey = (cardModel: OutcomeCardModel): string =>
  cardModel.key;

const areSetsEqual = <T>(first: Set<T>, second: Set<T>): boolean => {
  if (first.size !== second.size) {
    return false;
  }

  for (const value of first) {
    if (!second.has(value)) {
      return false;
    }
  }

  return true;
};

const getCardPriceQueries = (
  cardModel: OutcomeCardModel,
  selectedLineIndex: number | undefined,
): PriceQuery[] => {
  if (cardModel.kind === 'simple') {
    return cardModel.outcome.tokens.map((token) =>
      toPriceQuery(cardModel.outcome, token.id),
    );
  }

  if (cardModel.kind === 'moneyline') {
    return cardModel.outcomes.flatMap((outcome) => {
      const token = outcome.tokens[0];
      return token ? [toPriceQuery(outcome, token.id)] : [];
    });
  }

  const selectedOutcome = getSelectedLineOutcome(cardModel, selectedLineIndex);
  if (!selectedOutcome) {
    return [];
  }

  return selectedOutcome.tokens.map((token) =>
    toPriceQuery(selectedOutcome, token.id),
  );
};

export const resolveVisibleOutcomePriceQueries = ({
  cardModels,
  getCardVisibleKey = defaultGetCardVisibleKey,
  selectedLineIndices,
  visibleCardKeys,
}: {
  cardModels: OutcomeCardModel[];
  getCardVisibleKey?: (cardModel: OutcomeCardModel) => string;
  selectedLineIndices: Record<string, number | undefined>;
  visibleCardKeys: Set<string>;
}): PriceQuery[] => {
  const queriesByTokenId = new Map<string, PriceQuery>();

  cardModels
    .filter((cardModel) => visibleCardKeys.has(getCardVisibleKey(cardModel)))
    .flatMap((cardModel) =>
      getCardPriceQueries(cardModel, selectedLineIndices[cardModel.key]),
    )
    .forEach((query) => {
      if (!queriesByTokenId.has(query.outcomeTokenId)) {
        queriesByTokenId.set(query.outcomeTokenId, query);
      }
    });

  return [...queriesByTokenId.values()];
};

export const usePredictVisibleOutcomes = <TItem>({
  cardModels,
  enabled = true,
  getVisibleCardKey,
  getCardVisibleKey = defaultGetCardVisibleKey,
  preserveVisibleCardPositionsOnReset = false,
  resetKey,
  settleDelayMs = DEFAULT_SETTLE_DELAY_MS,
}: UsePredictVisibleOutcomesParams<TItem>): UsePredictVisibleOutcomesResult<TItem> => {
  const [visibleCardKeys, setVisibleCardKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedLineIndices, setSelectedLineIndices] = useState<
    Record<string, number | undefined>
  >({});
  const latestVisibleCardKeysRef = useRef<Set<string>>(new Set());
  const latestVisibleCardIndexesRef = useRef<number[]>([]);
  const isScrollActiveRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousResetKeyRef = useRef(resetKey);
  const shouldCommitNextViewabilityImmediatelyRef = useRef(false);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const clearScrollIdleTimer = useCallback(() => {
    if (scrollIdleTimerRef.current) {
      clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = null;
    }
  }, []);

  const applyLatestVisibleCardKeys = useCallback(() => {
    if (!enabled) {
      return;
    }

    const nextVisibleCardKeys = new Set(latestVisibleCardKeysRef.current);
    setVisibleCardKeys((previousVisibleCardKeys) =>
      areSetsEqual(previousVisibleCardKeys, nextVisibleCardKeys)
        ? previousVisibleCardKeys
        : nextVisibleCardKeys,
    );
  }, [enabled]);

  const commitLatestVisibleCardKeys = useCallback(() => {
    clearSettleTimer();

    if (!enabled) {
      return;
    }

    settleTimerRef.current = setTimeout(() => {
      applyLatestVisibleCardKeys();
      settleTimerRef.current = null;
    }, settleDelayMs);
  }, [applyLatestVisibleCardKeys, clearSettleTimer, enabled, settleDelayMs]);

  const clearVisibleState = useCallback(() => {
    clearSettleTimer();
    clearScrollIdleTimer();
    isScrollActiveRef.current = false;
    latestVisibleCardKeysRef.current = new Set();
    latestVisibleCardIndexesRef.current = [];
    setVisibleCardKeys((previousVisibleCardKeys) =>
      previousVisibleCardKeys.size === 0 ? previousVisibleCardKeys : new Set(),
    );
    setSelectedLineIndices((previousSelectedLineIndices) =>
      Object.keys(previousSelectedLineIndices).length === 0
        ? previousSelectedLineIndices
        : {},
    );
  }, [clearScrollIdleTimer, clearSettleTimer]);

  const onScrollStart = useCallback(() => {
    if (!enabled) {
      return;
    }

    isScrollActiveRef.current = true;
    clearSettleTimer();
    clearScrollIdleTimer();
  }, [clearScrollIdleTimer, clearSettleTimer, enabled]);

  const onScrollEnd = useCallback(() => {
    if (!enabled) {
      return;
    }

    isScrollActiveRef.current = false;
    clearScrollIdleTimer();
    commitLatestVisibleCardKeys();
  }, [clearScrollIdleTimer, commitLatestVisibleCardKeys, enabled]);

  const onScroll = useCallback(() => {
    if (!enabled) {
      return;
    }

    isScrollActiveRef.current = true;
    clearSettleTimer();
    clearScrollIdleTimer();

    scrollIdleTimerRef.current = setTimeout(() => {
      isScrollActiveRef.current = false;
      applyLatestVisibleCardKeys();
      scrollIdleTimerRef.current = null;
    }, settleDelayMs);
  }, [
    applyLatestVisibleCardKeys,
    clearScrollIdleTimer,
    clearSettleTimer,
    enabled,
    settleDelayMs,
  ]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item?: TItem | null }[] }) => {
      if (!enabled) {
        return;
      }

      const nextVisibleCardKeys = new Set(
        viewableItems
          .map((viewableItem) =>
            viewableItem.item
              ? getVisibleCardKey(viewableItem.item)
              : undefined,
          )
          .filter((key): key is string => Boolean(key)),
      );
      latestVisibleCardKeysRef.current = nextVisibleCardKeys;
      latestVisibleCardIndexesRef.current = cardModels
        .map((cardModel, index) =>
          nextVisibleCardKeys.has(getCardVisibleKey(cardModel)) ? index : -1,
        )
        .filter((index) => index !== -1);

      if (!isScrollActiveRef.current) {
        if (shouldCommitNextViewabilityImmediatelyRef.current) {
          shouldCommitNextViewabilityImmediatelyRef.current = false;
          clearSettleTimer();
          applyLatestVisibleCardKeys();
          return;
        }

        commitLatestVisibleCardKeys();
      }
    },
    [
      applyLatestVisibleCardKeys,
      cardModels,
      clearSettleTimer,
      commitLatestVisibleCardKeys,
      enabled,
      getCardVisibleKey,
      getVisibleCardKey,
    ],
  );

  const onSelectedLineIndexChange = useCallback(
    (cardKey: string, nextIndex: number) => {
      setSelectedLineIndices((previousSelectedLineIndices) =>
        previousSelectedLineIndices[cardKey] === nextIndex
          ? previousSelectedLineIndices
          : {
              ...previousSelectedLineIndices,
              [cardKey]: nextIndex,
            },
      );
    },
    [],
  );

  useEffect(() => {
    if (enabled) {
      return;
    }

    clearVisibleState();
  }, [clearVisibleState, enabled]);

  useEffect(() => {
    if (previousResetKeyRef.current === resetKey) {
      return;
    }

    previousResetKeyRef.current = resetKey;
    shouldCommitNextViewabilityImmediatelyRef.current = true;

    if (!enabled || !preserveVisibleCardPositionsOnReset) {
      clearVisibleState();
      return;
    }

    clearSettleTimer();
    clearScrollIdleTimer();
    isScrollActiveRef.current = false;

    const nextVisibleCardKeys = new Set(
      latestVisibleCardIndexesRef.current
        .map((index) => cardModels[index])
        .filter((cardModel): cardModel is OutcomeCardModel =>
          Boolean(cardModel),
        )
        .map(getCardVisibleKey),
    );

    latestVisibleCardKeysRef.current = nextVisibleCardKeys;
    setVisibleCardKeys((previousVisibleCardKeys) =>
      areSetsEqual(previousVisibleCardKeys, nextVisibleCardKeys)
        ? previousVisibleCardKeys
        : nextVisibleCardKeys,
    );
    setSelectedLineIndices((previousSelectedLineIndices) =>
      Object.keys(previousSelectedLineIndices).length === 0
        ? previousSelectedLineIndices
        : {},
    );
  }, [
    cardModels,
    clearScrollIdleTimer,
    clearSettleTimer,
    clearVisibleState,
    enabled,
    getCardVisibleKey,
    preserveVisibleCardPositionsOnReset,
    resetKey,
  ]);

  useEffect(
    () => () => {
      clearSettleTimer();
      clearScrollIdleTimer();
    },
    [clearScrollIdleTimer, clearSettleTimer],
  );

  const visiblePriceQueries = useMemo(
    () =>
      resolveVisibleOutcomePriceQueries({
        cardModels,
        getCardVisibleKey,
        selectedLineIndices,
        visibleCardKeys,
      }),
    [cardModels, getCardVisibleKey, selectedLineIndices, visibleCardKeys],
  );

  const visibleTokenIds = useMemo(
    () => visiblePriceQueries.map((query) => query.outcomeTokenId),
    [visiblePriceQueries],
  );

  return {
    onMomentumScrollBegin: onScrollStart,
    onMomentumScrollEnd: onScrollEnd,
    onScroll,
    onScrollBeginDrag: onScrollStart,
    onScrollEndDrag: onScrollEnd,
    onSelectedLineIndexChange,
    onViewableItemsChanged,
    selectedLineIndices,
    viewabilityConfig: PREDICT_OUTCOME_VIEWABILITY_CONFIG,
    visibleCardKeys,
    visiblePriceQueries,
    visibleTokenIds,
  };
};
