import { useCallback, useRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';
import { calculateChipScrollX } from './calculateChipScrollX';

export function useChipScrollList(chipCount: number) {
  const scrollViewRef = useRef<ScrollView>(null);
  const chipLayoutsRef = useRef<Map<number, { x: number; width: number }>>(
    new Map(),
  );
  const viewportWidthRef = useRef(0);

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    viewportWidthRef.current = event.nativeEvent.layout.width;
  }, []);

  const handleChipLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      chipLayoutsRef.current.set(index, { x, width });
    },
    [],
  );

  const scrollToChipAtIndex = useCallback(
    (chipIndex: number) => {
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

      scrollView.scrollTo({ x: scrollX, animated: true });
    },
    [chipCount],
  );

  return {
    scrollViewRef,
    handleScrollViewLayout,
    handleChipLayout,
    scrollToChipAtIndex,
  };
}
