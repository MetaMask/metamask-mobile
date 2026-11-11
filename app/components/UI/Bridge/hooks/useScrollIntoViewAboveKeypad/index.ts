import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

/**
 * Breathing room kept between the bottom of the target and the keypad.
 */
export const KEYPAD_TARGET_MARGIN = 12;

/**
 * Allowance for sub-pixel rounding when comparing reported content heights.
 */
const CONTENT_SIZE_TOLERANCE = 1;

export type MeasureInWindow = (
  callback: (x: number, y: number, width: number, height: number) => void,
) => void;

interface UseScrollIntoViewAboveKeypadOptions {
  /**
   * Whether the target is the field currently being edited with the keypad.
   * The scroll only happens while this is true.
   */
  isTargetActive: boolean;
  scrollViewRef: RefObject<ScrollView | null>;
  /**
   * Measures the target against the window. Must be referentially stable.
   */
  measureTarget: MeasureInWindow;
}

/**
 * The keypad is a bottom sheet laid over the screen, so on short devices it
 * can cover the field it is editing. This keeps that field visible by
 * scrolling it above the keypad.
 *
 * Assumes the scroll view and the keypad share the same parent and top edge,
 * so the keypad's `layout.y` is also the visible height of the scroll view.
 */
export const useScrollIntoViewAboveKeypad = ({
  isTargetActive,
  scrollViewRef,
  measureTarget,
}: UseScrollIntoViewAboveKeypadOptions) => {
  const scrollOffsetRef = useRef(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [keypadTop, setKeypadTop] = useState<number>();
  const [contentHeight, setContentHeight] = useState(0);

  const baseContentHeightRef = useRef<number | undefined>(undefined);
  const keypadOverlapRef = useRef(0);

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      // Only a size reported without padding is a baseline; once the padding is
      // applied the size is the baseline plus the padding.
      if (keypadOverlapRef.current === 0) {
        baseContentHeightRef.current = height;
      }
      setContentHeight(height);
    },
    [],
  );

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const handleKeypadLayout = useCallback((event: LayoutChangeEvent) => {
    setKeypadTop(event.nativeEvent.layout.y);
  }, []);

  // Forgetting the position on close makes the next open count as new, even
  // when the keypad lands exactly where it was before.
  const handleKeypadClose = useCallback(() => setKeypadTop(undefined), []);

  // Content below the fold can only be scrolled up to the keypad if there is
  // scroll range for it. Padding by the covered height guarantees that even
  // when the page is shorter than the screen.
  const keypadOverlap =
    keypadTop === undefined ? 0 : Math.max(viewportHeight - keypadTop, 0);

  keypadOverlapRef.current = keypadOverlap;

  useEffect(() => {
    if (!isTargetActive || keypadTop === undefined) {
      return;
    }

    // The padding is applied in the same commit that sets `keypadTop`, but the
    // native content only grows afterwards. Scrolling before that would be
    // clamped to the old range, so wait for the content size to catch up; the
    // size change re-runs this effect.
    const baseContentHeight = baseContentHeightRef.current;
    if (
      baseContentHeight !== undefined &&
      contentHeight < baseContentHeight + keypadOverlap - CONTENT_SIZE_TOLERANCE
    ) {
      return;
    }

    scrollViewRef.current
      ?.getNativeScrollRef()
      ?.measureInWindow((_x, scrollViewTop) => {
        measureTarget((_targetX, targetTop, _targetWidth, targetHeight) => {
          const targetBottom =
            targetTop - scrollViewTop + targetHeight + KEYPAD_TARGET_MARGIN;
          const hiddenHeight = targetBottom - keypadTop;

          if (hiddenHeight > 0) {
            scrollViewRef.current?.scrollTo({
              y: scrollOffsetRef.current + hiddenHeight,
              animated: true,
            });
          }
        });
      });
  }, [
    contentHeight,
    isTargetActive,
    keypadOverlap,
    keypadTop,
    measureTarget,
    scrollViewRef,
  ]);

  return {
    keypadOverlap,
    onContentSizeChange: handleContentSizeChange,
    keypadLayoutProps: {
      onLayout: handleKeypadLayout,
      onClose: handleKeypadClose,
    },
    onScroll: handleScroll,
    onScrollViewLayout: handleScrollViewLayout,
  };
};
