import { useMemo } from 'react';
import { Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

const ACTIVE_OFFSET_X = 10;
const FAIL_OFFSET_Y = 15;
const MIN_SWIPE_DISTANCE = 50;
const MIN_SWIPE_VELOCITY = 500;

export interface UseFirstPageSwipeGestureOptions {
  /**
   * Whether the pager is showing its first page.
   * This is used to know if a swipe/back action needs to navigate
   * back to homepage.
   */
  isOnFirstPage: boolean;
  /**
   * Whether the pager has more than one page to swipe to.
   */
  hasMultiplePages: boolean;
  /**
   * Leaves the screen. Called on a right swipe on Android.
   */
  onSwipeBack: () => void;
  testID?: string;
}

/**
 * Handles leaving a native stack screen from the first page of a `PagerView`.
 *
 * On iOS that is the native stack's back gesture, which a scrollable pager
 * blocks even from the screen edge. The pager stays scrollable so swiping
 * between pages follows the finger, and the screen edge is kept off the pager
 * on the first page (`isBackGestureEdgeVisible`) so the back gesture can
 * start there. Android's native stack has no back gesture, so a right swipe
 * on the first page is handled by the returned gesture instead.
 *
 * @param options - See {@link UseFirstPageSwipeGestureOptions}.
 * @returns The gesture to attach with `GestureDetector` around the pager, the
 * pager's `scrollEnabled` value, and whether to render the back gesture edge
 * over the pager.
 */
export const useFirstPageSwipeGesture = ({
  isOnFirstPage,
  hasMultiplePages,
  onSwipeBack,
  testID,
}: UseFirstPageSwipeGestureOptions) => {
  const isBackGestureEdgeVisible =
    Platform.OS === 'ios' && isOnFirstPage && hasMultiplePages;

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(Platform.OS === 'android' && isOnFirstPage)
      .activeOffsetX(ACTIVE_OFFSET_X)
      .failOffsetX(-ACTIVE_OFFSET_X)
      .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
      .maxPointers(1)
      .onEnd(({ translationX, velocityX }) => {
        'worklet';
        if (
          translationX > MIN_SWIPE_DISTANCE ||
          velocityX > MIN_SWIPE_VELOCITY
        ) {
          scheduleOnRN(onSwipeBack);
        }
      });
    return testID ? pan.withTestId(testID) : pan;
  }, [isOnFirstPage, onSwipeBack, testID]);

  return {
    gesture,
    isPagerScrollEnabled: hasMultiplePages,
    isBackGestureEdgeVisible,
  };
};
