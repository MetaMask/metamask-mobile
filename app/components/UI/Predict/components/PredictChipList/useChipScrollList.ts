import { useCallback, useRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';
import { calculateChipScrollX } from './calculateChipScrollX';

export function useChipScrollList(chipCount: number) {
  const scrollViewRef = useRef<ScrollView>(null);
  const chipLayoutsRef = useRef<Map<number, { x: number; width: number }>>(
    new Map(),
  );
  const viewportWidthRef = useRef(0);
  const pendingChipIndexRef = useRef<number | null>(null);

  const tryScrollToChip = useCallback(
    (chipIndex: number, animated = false) => {
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
      tryFlushPendingScroll();
    },
    [tryFlushPendingScroll],
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

  const scrollToChipAtIndex = useCallback(
    (chipIndex: number, animated = false) => {
      tryScrollToChip(chipIndex, animated);
    },
    [tryScrollToChip],
  );

  return {
    scrollViewRef,
    handleScrollViewLayout,
    handleChipLayout,
    scrollToChipAtIndex,
  };
}
