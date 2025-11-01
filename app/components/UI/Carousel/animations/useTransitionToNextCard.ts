import { useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { ANIMATION_TIMINGS } from './animationTimings';

export interface TransitionToNextCardParams {
  // Current card animations (exit)
  currentCardOpacity: Animated.Value;
  currentCardScale: Animated.Value;
  currentCardTranslateY: Animated.Value;

  // Next card animations (enter)
  nextCardOpacity: Animated.Value;
  nextCardScale: Animated.Value;
  nextCardTranslateY: Animated.Value;
  nextCardBgOpacity: Animated.Value;

  // Empty state animations (for last card transition)
  emptyStateOpacity?: Animated.Value;
  emptyStateScale?: Animated.Value;
  emptyStateTranslateY?: Animated.Value;
}

export const useTransitionToNextCard = (params: TransitionToNextCardParams) => {
  const {
    currentCardOpacity,
    currentCardScale,
    currentCardTranslateY,
    nextCardOpacity,
    nextCardScale,
    nextCardTranslateY,
    nextCardBgOpacity,
    emptyStateOpacity,
    emptyStateScale,
    emptyStateTranslateY,
  } = params;

  const executeTransition = useCallback(
    (targetType: 'nextCard' | 'emptyCard'): Promise<void> => {
      const hasNextSlide = targetType === 'nextCard';
      const isLastCard = targetType === 'emptyCard';
      return new Promise((resolve) => {
        Animated.parallel([
          // Current card exit animation (fade + move up + scale up slightly)
          Animated.timing(currentCardOpacity, {
            toValue: 0,
            duration: ANIMATION_TIMINGS.CARD_EXIT_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(currentCardScale, {
            toValue: 1.015, // Slight scale up as it exits
            duration: ANIMATION_TIMINGS.CARD_EXIT_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(currentCardTranslateY, {
            toValue: -8, // Move up slightly
            duration: ANIMATION_TIMINGS.CARD_EXIT_DURATION,
            useNativeDriver: true,
          }),

          // Background fade (starts immediately with card A exit)
          Animated.timing(nextCardBgOpacity, {
            toValue: 0, // Fade out pressed background
            duration: ANIMATION_TIMINGS.CARD_EXIT_DURATION,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic), // Starts fast, ends slow
          }),

          // Next card/empty state enter animation - starts with delay
          Animated.sequence([
            Animated.delay(ANIMATION_TIMINGS.CARD_ENTER_DELAY),
            Animated.parallel([
              // For normal next card
              ...(hasNextSlide
                ? [
                    Animated.timing(nextCardOpacity, {
                      toValue: 1,
                      duration: ANIMATION_TIMINGS.CARD_ENTER_DURATION,
                      useNativeDriver: true,
                    }),
                    Animated.timing(nextCardScale, {
                      toValue: 1, // Scale to full size
                      duration: ANIMATION_TIMINGS.CARD_ENTER_DURATION,
                      useNativeDriver: true,
                    }),
                    Animated.timing(nextCardTranslateY, {
                      toValue: 0, // Move to final position
                      duration: ANIMATION_TIMINGS.CARD_ENTER_DURATION,
                      useNativeDriver: true,
                    }),
                  ]
                : []),

              // For empty state (when it's the last card)
              ...(isLastCard &&
              emptyStateOpacity &&
              emptyStateScale &&
              emptyStateTranslateY
                ? [
                    Animated.timing(emptyStateOpacity, {
                      toValue: 1, // From dimmed to full brightness
                      duration: ANIMATION_TIMINGS.CARD_ENTER_DURATION,
                      useNativeDriver: true,
                    }),
                    Animated.timing(emptyStateScale, {
                      toValue: 1, // Scale to full size (same as next cards)
                      duration: ANIMATION_TIMINGS.CARD_ENTER_DURATION,
                      useNativeDriver: true,
                    }),
                    Animated.timing(emptyStateTranslateY, {
                      toValue: 0, // Move to final position
                      duration: ANIMATION_TIMINGS.CARD_ENTER_DURATION,
                      useNativeDriver: true,
                    }),
                  ]
                : []),
            ]),
          ]),
        ]).start(() => resolve());
      });
    },
    [
      currentCardOpacity,
      currentCardScale,
      currentCardTranslateY,
      nextCardOpacity,
      nextCardScale,
      nextCardTranslateY,
      nextCardBgOpacity,
      emptyStateOpacity,
      emptyStateScale,
      emptyStateTranslateY,
    ],
  );

  return { executeTransition };
};
