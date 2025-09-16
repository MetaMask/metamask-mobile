import { Animated, Easing } from 'react-native';
import { ANIMATION_TIMINGS } from '../animationTimings';

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

  // Callbacks
  onComplete: () => void;

  // Flags
  hasNextSlide: boolean;
  isLastCard: boolean;
}

export interface EmptyStateAnimationParams {
  emptyStateOpacity: Animated.Value;
  emptyStateScale: Animated.Value;
  emptyStateTranslateY: Animated.Value;
}

export const TransitionToNextCard = ({
  currentCardOpacity,
  currentCardScale,
  currentCardTranslateY,
  nextCardOpacity,
  nextCardScale,
  nextCardTranslateY,
  nextCardBgOpacity,
  onComplete,
  hasNextSlide,
  isLastCard,
  emptyStateAnimations,
}: TransitionToNextCardParams & {
  emptyStateAnimations?: EmptyStateAnimationParams;
}) =>
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
      Animated.delay(ANIMATION_TIMINGS.CARD_ENTER_DELAY), // Slight overlap for natural feel
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
        ...(isLastCard && emptyStateAnimations
          ? [
              Animated.timing(emptyStateAnimations.emptyStateOpacity, {
                toValue: 1, // From dimmed to full brightness
                duration: ANIMATION_TIMINGS.CARD_ENTER_DURATION,
                useNativeDriver: true,
              }),
              Animated.timing(emptyStateAnimations.emptyStateScale, {
                toValue: 1, // Scale to full size (same as next cards)
                duration: ANIMATION_TIMINGS.CARD_ENTER_DURATION,
                useNativeDriver: true,
              }),
              Animated.timing(emptyStateAnimations.emptyStateTranslateY, {
                toValue: 0, // Move to final position
                duration: ANIMATION_TIMINGS.CARD_ENTER_DURATION,
                useNativeDriver: true,
              }),
            ]
          : []),
      ]),
    ]),
  ]).start(onComplete);
