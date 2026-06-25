import { useCallback, useEffect, useRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';
import { calculateChipScrollX } from './calculateChipScrollX';

interface UseChipScrollListOptions {
  activeChipIndex?: number;
}

interface ScrollToChipOptions {
  animated?: boolean;
}

export function useChipScrollList(
  chipCount: number,
  options: UseChipScrollListOptions = {},
) {
  const { activeChipIndex } = options;
  const scrollViewRef = useRef<ScrollView>(null);
  const chipLayoutsRef = useRef<Map<number, { x: number; width: number }>>(
    new Map(),
  );
  const viewportWidthRef = useRef(0);
  // Active index still owed an auto-scroll. `null` once positioned, so
  // incidental relayouts don't snap the rail back over a user's manual scroll.
  const pendingAutoScrollIndexRef = useRef<number | null>(
    activeChipIndex ?? null,
  );

  const scrollToChipAtIndex = useCallback(
    (chipIndex: number, scrollOptions: ScrollToChipOptions = {}) => {
      const { animated = true } = scrollOptions;
      const scrollView = scrollViewRef.current;
      const viewportWidth = viewportWidthRef.current;
      if (!scrollView || viewportWidth === 0) {
        return false;
      }

      const scrollX = calculateChipScrollX(
        chipIndex,
        chipCount,
        chipLayoutsRef.current,
        viewportWidth,
      );
      if (scrollX === null) {
        return false;
      }

      scrollView.scrollTo({ x: scrollX, animated });
      return true;
    },
    [chipCount],
  );

  // Scrolls to a still-pending active chip, then clears the marker so later
  // layout passes leave the user's scroll position alone.
  const flushPendingAutoScroll = useCallback(
    (animated: boolean) => {
      const pendingIndex = pendingAutoScrollIndexRef.current;
      if (
        pendingIndex === null ||
        pendingIndex < 0 ||
        pendingIndex >= chipCount
      ) {
        return;
      }

      if (scrollToChipAtIndex(pendingIndex, { animated })) {
        pendingAutoScrollIndexRef.current = null;
      }
    },
    [chipCount, scrollToChipAtIndex],
  );

  const handleScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportWidthRef.current = event.nativeEvent.layout.width;
      flushPendingAutoScroll(false);
    },
    [flushPendingAutoScroll],
  );

  const handleChipLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      chipLayoutsRef.current.set(index, { x, width });
      flushPendingAutoScroll(false);
    },
    [flushPendingAutoScroll],
  );

  // Mark the new active index pending; a layout pass flushes it if not yet ready.
  useEffect(() => {
    if (
      activeChipIndex === undefined ||
      activeChipIndex < 0 ||
      activeChipIndex >= chipCount
    ) {
      pendingAutoScrollIndexRef.current = null;
      return;
    }

    pendingAutoScrollIndexRef.current = activeChipIndex;
    flushPendingAutoScroll(true);
  }, [activeChipIndex, chipCount, flushPendingAutoScroll]);

  return {
    scrollViewRef,
    handleScrollViewLayout,
    handleChipLayout,
    scrollToChipAtIndex,
  };
}
