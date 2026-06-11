import { useCallback, useRef } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { calculateChipScrollX } from './calculateChipScrollX';

const chipScrollOffsetCache = new Map<string, number>();

export function useChipScrollList(
  chipCount: number,
  scrollPersistenceKey?: string,
) {
  const scrollViewRef = useRef<ScrollView>(null);
  const chipLayoutsRef = useRef<Map<number, { x: number; width: number }>>(
    new Map(),
  );
  const viewportWidthRef = useRef(0);
  const pendingChipIndexRef = useRef<number | null>(null);
  const persistedOffset =
    scrollPersistenceKey !== undefined
      ? chipScrollOffsetCache.get(scrollPersistenceKey)
      : undefined;
  const hasPersistedOffset = persistedOffset !== undefined;
  const initialScrollX = persistedOffset ?? 0;
  const isHydratingPersistedOffsetRef = useRef(hasPersistedOffset);

  const restorePersistedOffset = useCallback(() => {
    if (!scrollPersistenceKey) {
      isHydratingPersistedOffsetRef.current = false;
      return false;
    }
    const scrollView = scrollViewRef.current;
    const viewportWidth = viewportWidthRef.current;
    const cachedOffset = chipScrollOffsetCache.get(scrollPersistenceKey);
    if (!scrollView || viewportWidth === 0 || cachedOffset === undefined) {
      return false;
    }

    scrollView.scrollTo({ x: cachedOffset, animated: false });
    isHydratingPersistedOffsetRef.current = false;
    return true;
  }, [scrollPersistenceKey]);

  const tryScrollToChip = useCallback(
    (chipIndex: number, animated = true) => {
      const scrollView = scrollViewRef.current;
      const viewportWidth = viewportWidthRef.current;
      if (!scrollView || viewportWidth === 0) {
        pendingChipIndexRef.current = chipIndex;
        return false;
      }

      const scrollX = calculateChipScrollX(
        chipIndex,
        chipCount,
        chipLayoutsRef.current,
        viewportWidth,
      );
      if (scrollX === null) {
        pendingChipIndexRef.current = chipIndex;
        return false;
      }

      pendingChipIndexRef.current = null;
      scrollView.scrollTo({ x: scrollX, animated });
      return true;
    },
    [chipCount],
  );

  const tryFlushPendingScroll = useCallback(() => {
    const pendingChipIndex = pendingChipIndexRef.current;
    if (pendingChipIndex === null) {
      return;
    }
    tryScrollToChip(pendingChipIndex);
  }, [tryScrollToChip]);

  const handleScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportWidthRef.current = event.nativeEvent.layout.width;
      restorePersistedOffset();
      tryFlushPendingScroll();
    },
    [restorePersistedOffset, tryFlushPendingScroll],
  );

  const handleChipLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      chipLayoutsRef.current.set(index, { x, width });
      if (pendingChipIndexRef.current === index) {
        tryFlushPendingScroll();
      }
    },
    [tryFlushPendingScroll],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!scrollPersistenceKey) {
        return;
      }
      if (isHydratingPersistedOffsetRef.current) {
        return;
      }
      chipScrollOffsetCache.set(
        scrollPersistenceKey,
        event.nativeEvent.contentOffset.x,
      );
    },
    [scrollPersistenceKey],
  );

  const scrollToChipAtIndex = useCallback(
    (chipIndex: number, animated = true) => {
      tryScrollToChip(chipIndex, animated);
    },
    [tryScrollToChip],
  );

  return {
    scrollViewRef,
    handleScrollViewLayout,
    handleChipLayout,
    handleScroll,
    scrollToChipAtIndex,
    hasPersistedOffset,
    initialScrollX,
  };
}
