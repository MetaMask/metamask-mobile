import { useCallback, useEffect, useRef, useState } from 'react';
import { areSetsEqual } from '../utils/sets';

const DEFAULT_SETTLE_DELAY_MS = 200;

interface UseSettledFlashListVisibilityParams<TItem> {
  enabled?: boolean;
  getVisibleKey: (item: TItem) => string | undefined;
  resetKey?: string;
  settleDelayMs?: number;
}

interface UseSettledFlashListVisibilityResult<TItem> {
  onMomentumScrollBegin: () => void;
  onMomentumScrollEnd: () => void;
  onScroll: () => void;
  onScrollBeginDrag: () => void;
  onScrollEndDrag: () => void;
  onViewableItemsChanged: ({
    viewableItems,
  }: {
    viewableItems: { item?: TItem | null }[];
  }) => void;
  visibleKeys: Set<string>;
}

export const useSettledFlashListVisibility = <TItem>({
  enabled = true,
  getVisibleKey,
  resetKey,
  settleDelayMs = DEFAULT_SETTLE_DELAY_MS,
}: UseSettledFlashListVisibilityParams<TItem>): UseSettledFlashListVisibilityResult<TItem> => {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => new Set());
  const latestVisibleKeysRef = useRef<Set<string>>(new Set());
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

  const applyLatestVisibleKeys = useCallback(() => {
    if (!enabled) {
      return;
    }

    const nextVisibleKeys = new Set(latestVisibleKeysRef.current);
    setVisibleKeys((prevVisibleKeys) =>
      areSetsEqual(prevVisibleKeys, nextVisibleKeys)
        ? prevVisibleKeys
        : nextVisibleKeys,
    );
  }, [enabled]);

  const commitLatestVisibleKeys = useCallback(() => {
    clearSettleTimer();

    if (!enabled) {
      return;
    }

    settleTimerRef.current = setTimeout(() => {
      applyLatestVisibleKeys();
      settleTimerRef.current = null;
    }, settleDelayMs);
  }, [applyLatestVisibleKeys, clearSettleTimer, enabled, settleDelayMs]);

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
    commitLatestVisibleKeys();
  }, [clearScrollIdleTimer, commitLatestVisibleKeys, enabled]);

  const onScroll = useCallback(() => {
    if (!enabled) {
      return;
    }

    isScrollActiveRef.current = true;
    clearSettleTimer();
    clearScrollIdleTimer();

    scrollIdleTimerRef.current = setTimeout(() => {
      isScrollActiveRef.current = false;
      applyLatestVisibleKeys();
      scrollIdleTimerRef.current = null;
    }, settleDelayMs);
  }, [
    applyLatestVisibleKeys,
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

      latestVisibleKeysRef.current = new Set(
        viewableItems
          .map((viewableItem) =>
            viewableItem.item ? getVisibleKey(viewableItem.item) : undefined,
          )
          .filter((key): key is string => Boolean(key)),
      );

      if (previousResetKeyRef.current !== resetKey) {
        previousResetKeyRef.current = resetKey;
        shouldCommitNextViewabilityImmediatelyRef.current = false;
        isScrollActiveRef.current = false;
        clearSettleTimer();
        clearScrollIdleTimer();
        applyLatestVisibleKeys();
        return;
      }

      if (!isScrollActiveRef.current) {
        if (shouldCommitNextViewabilityImmediatelyRef.current) {
          shouldCommitNextViewabilityImmediatelyRef.current = false;
          clearSettleTimer();
          applyLatestVisibleKeys();
          return;
        }

        commitLatestVisibleKeys();
      }
    },
    [
      applyLatestVisibleKeys,
      clearScrollIdleTimer,
      clearSettleTimer,
      commitLatestVisibleKeys,
      enabled,
      getVisibleKey,
      resetKey,
    ],
  );

  const clearVisibleKeys = useCallback(() => {
    clearSettleTimer();
    clearScrollIdleTimer();
    isScrollActiveRef.current = false;
    latestVisibleKeysRef.current = new Set();
    setVisibleKeys((prevVisibleKeys) =>
      prevVisibleKeys.size === 0 ? prevVisibleKeys : new Set(),
    );
  }, [clearScrollIdleTimer, clearSettleTimer]);

  useEffect(() => {
    if (enabled) {
      return;
    }

    clearVisibleKeys();
  }, [clearVisibleKeys, enabled]);

  useEffect(() => {
    if (previousResetKeyRef.current === resetKey) {
      return;
    }

    previousResetKeyRef.current = resetKey;
    clearVisibleKeys();
    shouldCommitNextViewabilityImmediatelyRef.current = true;
  }, [clearVisibleKeys, resetKey]);

  useEffect(
    () => () => {
      clearSettleTimer();
      clearScrollIdleTimer();
    },
    [clearScrollIdleTimer, clearSettleTimer],
  );

  return {
    onMomentumScrollBegin: onScrollStart,
    onMomentumScrollEnd: onScrollEnd,
    onScroll,
    onScrollBeginDrag: onScrollStart,
    onScrollEndDrag: onScrollEnd,
    onViewableItemsChanged,
    visibleKeys,
  };
};
