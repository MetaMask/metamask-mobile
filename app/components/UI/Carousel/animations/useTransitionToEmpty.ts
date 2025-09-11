import { useCallback } from 'react';
import { Animated } from 'react-native';
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
  carouselHeight: Animated.Value;
  carouselScaleY: Animated.Value;
}

export const useTransitionToEmpty = (
  animations?: TransitionToEmptyAnimations,
) => {
  const executeTransition = useCallback(
    (onEmptyStateComplete: () => void): Promise<void> => {
      return new Promise((resolve) => {
        if (!animations) {
          // Fallback - just wait and complete
          setTimeout(() => {
            onEmptyStateComplete();
            resolve();
          }, ANIMATION_TIMINGS.EMPTY_STATE_IDLE_TIME);
          return;
        }

        // Perform actual fold-up animation with staggered timing
        Animated.parallel([
          // Content fade out (starts immediately)
          Animated.timing(animations.emptyCardOpacity, {
            toValue: 0,
            duration: ANIMATION_TIMINGS.EMPTY_STATE_FADE_DURATION,
            useNativeDriver: true,
          }),
          
          // Height collapse (starts immediately, longest duration for content shifting)
          Animated.timing(animations.carouselHeight, {
            toValue: 0,
            duration: ANIMATION_TIMINGS.EMPTY_STATE_HEIGHT_DURATION,
            useNativeDriver: false, // Height needs layout thread
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
          onEmptyStateComplete();
          resolve();
        });
      });
    },
    [animations],
  );

  return { executeTransition };
};
