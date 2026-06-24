import { useCallback, useEffect, useRef } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

interface HorizontalScrollToSelectedOptions {
  /** Key of the currently selected item, or null/undefined to disable scrolling */
  selectedKey: string | undefined;
  /** Delay (ms) before scrolling — allows entry animations to settle */
  delay?: number;
  /** Horizontal padding to apply when scrolling an item into view */
  padding?: number;
}

/**
 * Hook that auto-scrolls a horizontal ScrollView to reveal the selected item
 * only when it is not already fully visible in the viewport.
 *
 * Returns props/handlers to wire into the ScrollView and its child items.
 */
export function useHorizontalScrollToSelected({
  selectedKey,
  delay = 350,
  padding = 16,
}: HorizontalScrollToSelectedOptions) {
  const scrollViewRef = useRef<{
    scrollTo(opts: { x: number; animated: boolean }): void;
  } | null>(null);
  const itemLayoutsRef = useRef<Record<string, { x: number; width: number }>>(
    {},
  );
  const scrollOffsetRef = useRef(0);
  const viewportWidthRef = useRef(0);
  const pendingScrollKeyRef = useRef<string | undefined>(undefined);
  const delayElapsedRef = useRef(false);

  const attemptScroll = useCallback(() => {
    const key = pendingScrollKeyRef.current;
    if (!key || !delayElapsedRef.current) {
      return;
    }

    const layout = itemLayoutsRef.current[key];
    if (!layout || !scrollViewRef.current || !viewportWidthRef.current) {
      return;
    }

    const itemLeft = layout.x;
    const itemRight = layout.x + layout.width;
    const visibleLeft = scrollOffsetRef.current;
    const visibleRight = visibleLeft + viewportWidthRef.current;

    const isFullyVisible = itemLeft >= visibleLeft && itemRight <= visibleRight;
    if (!isFullyVisible) {
      scrollViewRef.current.scrollTo({
        x: Math.max(0, layout.x - padding),
        animated: true,
      });
    }
    pendingScrollKeyRef.current = undefined;
  }, [padding]);

  const handleItemLayout = useCallback(
    (key: string, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      itemLayoutsRef.current[key] = { x, width };
      if (key === pendingScrollKeyRef.current) {
        attemptScroll();
      }
    },
    [attemptScroll],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.x;
    },
    [],
  );

  const handleScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportWidthRef.current = event.nativeEvent.layout.width;
      attemptScroll();
    },
    [attemptScroll],
  );

  useEffect(() => {
    if (!selectedKey) {
      pendingScrollKeyRef.current = undefined;
      delayElapsedRef.current = false;
      return;
    }
    pendingScrollKeyRef.current = selectedKey;
    delayElapsedRef.current = false;

    const timer = setTimeout(() => {
      delayElapsedRef.current = true;
      attemptScroll();
    }, delay);
    return () => {
      clearTimeout(timer);
      pendingScrollKeyRef.current = undefined;
      delayElapsedRef.current = false;
    };
  }, [selectedKey, delay, attemptScroll]);

  return {
    scrollViewRef,
    handleItemLayout,
    handleScroll,
    handleScrollViewLayout,
  };
}
