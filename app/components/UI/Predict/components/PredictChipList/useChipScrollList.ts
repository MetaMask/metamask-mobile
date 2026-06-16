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

  const scrollToChipAtIndex = useCallback(
    (chipIndex: number, scrollOptions: ScrollToChipOptions = {}) => {
      const { animated = true } = scrollOptions;
      const scrollView = scrollViewRef.current;
      const viewportWidth = viewportWidthRef.current;
      if (!scrollView || viewportWidth === 0) {
        return;
      }

      const scrollX = calculateChipScrollX(
        chipIndex,
        chipCount,
        chipLayoutsRef.current,
        viewportWidth,
      );
      if (scrollX === null) {
        return;
      }

      scrollView.scrollTo({ x: scrollX, animated });
    },
    [chipCount],
  );

  const scrollToActiveChip = useCallback(
    (animated: boolean) => {
      if (
        activeChipIndex === undefined ||
        activeChipIndex < 0 ||
        activeChipIndex >= chipCount
      ) {
        return;
      }

      scrollToChipAtIndex(activeChipIndex, { animated });
    },
    [activeChipIndex, chipCount, scrollToChipAtIndex],
  );

  const handleScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportWidthRef.current = event.nativeEvent.layout.width;
      scrollToActiveChip(false);
    },
    [scrollToActiveChip],
  );

  const handleChipLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      chipLayoutsRef.current.set(index, { x, width });
      scrollToActiveChip(false);
    },
    [scrollToActiveChip],
  );

  useEffect(() => {
    scrollToActiveChip(true);
  }, [scrollToActiveChip]);

  return {
    scrollViewRef,
    handleScrollViewLayout,
    handleChipLayout,
    scrollToChipAtIndex,
  };
}
