import { useCallback } from 'react';
import { Animated } from 'react-native';
import { runOnJS, type SharedValue, withTiming } from 'react-native-reanimated';
import { ANIMATION_TIMINGS } from './animationTimings';

export interface TransitionToEmptyParams {
  // Current card animations (exit)
  currentCardOpacity: Animated.Value;
  currentCardScale: Animated.Value;
  currentCardTranslateY: Animated.Value;

  // Empty state animations (enter)
  emptyStateOpacity: Animated.Value;
  emptyStateScale: Animated.Value;
  emptyStateTranslateY: Animated.Value;
  nextCardBgOpacity: Animated.Value;
}

export interface TransitionToEmptyAnimations {
  carouselOpacity: Animated.Value;
  emptyCardOpacity: Animated.Value;
  carouselHeight: SharedValue<number>;
  carouselScaleY: Animated.Value;
}

const animateCarouselHeight = (carouselHeight: SharedValue<number>) =>
  new Promise<void>((resolve) => {
    carouselHeight.value = withTiming(
      0,
      { duration: ANIMATION_TIMINGS.EMPTY_STATE_HEIGHT_DURATION },
      () => {
        runOnJS(resolve)();
      },
    );
  });

const animateCarouselVisuals = (animations: TransitionToEmptyAnimations) =>
  new Promise<void>((resolve) => {
    Animated.parallel([
      // Content fade out (starts immediately)
      Animated.timing(animations.emptyCardOpacity, {
        toValue: 0,
        duration: ANIMATION_TIMINGS.EMPTY_STATE_FADE_DURATION,
        useNativeDriver: true,
      }),

      // Visual fold (starts after delay, bottom-to-top)
      Animated.sequence([
        Animated.delay(ANIMATION_TIMINGS.EMPTY_STATE_FOLD_DELAY),
        Animated.timing(animations.carouselScaleY, {
          toValue: 0,
          duration: ANIMATION_TIMINGS.EMPTY_STATE_FOLD_DURATION,
          useNativeDriver: true,
        }),
      ]),

      // Overall carousel fade
      Animated.timing(animations.carouselOpacity, {
        toValue: 0,
        duration: ANIMATION_TIMINGS.EMPTY_STATE_HEIGHT_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      resolve();
    });
  });

export const useTransitionToEmpty = (
  animations?: TransitionToEmptyAnimations,
) => {
  const executeTransition = useCallback(
    (onEmptyStateComplete: () => void): Promise<void> =>
      new Promise((resolve) => {
        if (!animations) {
          // Fallback - just wait and complete
          setTimeout(() => {
            onEmptyStateComplete();
            resolve();
          }, ANIMATION_TIMINGS.EMPTY_STATE_IDLE_TIME);
          return;
        }

        // Height runs on the UI thread via Reanimated; opacity/scaleY stay native-driver.
        Promise.all([
          animateCarouselHeight(animations.carouselHeight),
          animateCarouselVisuals(animations),
        ]).then(() => {
          onEmptyStateComplete();
          resolve();
        });
      }),
    [animations],
  );

  return { executeTransition };
};
