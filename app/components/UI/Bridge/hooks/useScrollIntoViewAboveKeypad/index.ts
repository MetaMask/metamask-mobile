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

  useEffect(() => {
    if (!isTargetActive || keypadTop === undefined) {
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
  }, [isTargetActive, keypadTop, measureTarget, scrollViewRef]);

  return {
    keypadOverlap,
    keypadLayoutProps: {
      onLayout: handleKeypadLayout,
      onClose: handleKeypadClose,
    },
    onScroll: handleScroll,
    onScrollViewLayout: handleScrollViewLayout,
  };
};
