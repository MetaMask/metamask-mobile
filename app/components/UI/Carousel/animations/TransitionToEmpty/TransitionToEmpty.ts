import { Animated } from 'react-native';
import { ANIMATION_TIMINGS } from '../animationTimings';

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

  // Callbacks
  onComplete: () => void;
}

export const TransitionToEmpty = ({
  currentCardOpacity,
  currentCardScale,
  currentCardTranslateY,
  emptyStateOpacity,
  emptyStateScale,
  emptyStateTranslateY,
  nextCardBgOpacity,
  onComplete,
}: TransitionToEmptyParams) =>
  Animated.parallel([
    // Current card exit animation (same as normal transition)
    Animated.timing(currentCardOpacity, {
      toValue: 0,
      duration: ANIMATION_TIMINGS.CARD_EXIT_DURATION,
      useNativeDriver: true,
    }),
    Animated.timing(currentCardScale, {
      toValue: 1.015,
      duration: ANIMATION_TIMINGS.CARD_EXIT_DURATION,
      useNativeDriver: true,
    }),
    Animated.timing(currentCardTranslateY, {
      toValue: -8,
      duration: ANIMATION_TIMINGS.CARD_EXIT_DURATION,
      useNativeDriver: true,
    }),

    // Empty state enter animation (same as next card transition)
    Animated.sequence([
      Animated.delay(ANIMATION_TIMINGS.CARD_ENTER_DELAY), // Same overlap timing as normal cards
      Animated.parallel([
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
        Animated.timing(nextCardBgOpacity, {
          toValue: 0, // Fade out pressed background
          duration: ANIMATION_TIMINGS.CARD_EXIT_DURATION,
          useNativeDriver: true,
        }),
      ]),
    ]),
  ]).start(onComplete);
