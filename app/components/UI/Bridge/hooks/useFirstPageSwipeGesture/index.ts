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
   * Used to know if we should register the page transition.
   */
  hasMultiplePages: boolean;
  /**
   * Leaves the screen. Called on a right swipe on Android.
   */
  onSwipeBack: () => void;
  /**
   * Moves to the second page. Called on a left swipe on iOS.
   */
  onSwipeToNextPage: () => void;
  testID?: string;
}

/**
 * Handles horizontal swipes on the first page of a `PagerView` that sits in a
 * native stack screen.
 *
 * A right swipe on the first page leaves the screen. On iOS that is the
 * native stack's back gesture, which the pager's scroll view blocks even
 * from the screen edge, so the pager can't scroll on the first page and a
 * left swipe there is handled by this gesture instead. Android's native
 * stack has no back gesture, so the pager keeps left swipes and this
 * gesture handles the right swipe.
 *
 * @param options - See {@link UseFirstPageSwipeGestureOptions}.
 * @returns The gesture to attach with `GestureDetector` around the pager, and
 * the pager's `scrollEnabled` value.
 */
export const useFirstPageSwipeGesture = ({
  isOnFirstPage,
  hasMultiplePages,
  onSwipeBack,
  onSwipeToNextPage,
  testID,
}: UseFirstPageSwipeGestureOptions) => {
  const isPagerScrollEnabled =
    hasMultiplePages && !(Platform.OS === 'ios' && isOnFirstPage);

  const gesture = useMemo(() => {
    const isSwipeBack = Platform.OS === 'android';
    const pan = Gesture.Pan()
      .enabled(isOnFirstPage && (isSwipeBack || hasMultiplePages))
      .activeOffsetX(isSwipeBack ? ACTIVE_OFFSET_X : -ACTIVE_OFFSET_X)
      .failOffsetX(isSwipeBack ? -ACTIVE_OFFSET_X : ACTIVE_OFFSET_X)
      .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
      .maxPointers(1)
      .onEnd(({ translationX, velocityX }) => {
        'worklet';
        if (isSwipeBack) {
          if (
            translationX > MIN_SWIPE_DISTANCE ||
            velocityX > MIN_SWIPE_VELOCITY
          ) {
            scheduleOnRN(onSwipeBack);
          }
        } else if (
          translationX < -MIN_SWIPE_DISTANCE ||
          velocityX < -MIN_SWIPE_VELOCITY
        ) {
          scheduleOnRN(onSwipeToNextPage);
        }
      });
    return testID ? pan.withTestId(testID) : pan;
  }, [isOnFirstPage, hasMultiplePages, onSwipeBack, onSwipeToNextPage, testID]);

  return { gesture, isPagerScrollEnabled };
};
