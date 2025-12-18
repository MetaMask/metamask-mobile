import { useState, useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';

const SCROLL_THRESHOLD = 80;
// Threshold for enabling pointer events (50% of scroll threshold)
const POINTER_EVENTS_THRESHOLD_RATIO = 0.5;

/**
 * Hook for managing scroll-based header animation.
 * Tracks scroll position and provides animated styles for header fade-in effect.
 *
 * @param threshold - Scroll distance (in pixels) at which header fully fades in. Default: 80
 * @returns scrollOffsetY - Shared value tracking current scroll position
 * @returns scrollHandler - Handler to attach to Animated.ScrollView onScroll
 * @returns headerAnimatedStyle - Animated style with opacity based on scroll position
 * @returns isHeaderInteractive - Whether animated header should receive pointer events
 */
export const useHeaderScrollAnimation = (threshold = SCROLL_THRESHOLD) => {
  const scrollOffsetY = useSharedValue(0);
  const [isHeaderInteractive, setIsHeaderInteractive] = useState(false);
  const wasInteractiveRef = useSharedValue(false);

  const pointerEventsThreshold = threshold * POINTER_EVENTS_THRESHOLD_RATIO;

  const updateInteractiveState = useCallback((interactive: boolean) => {
    setIsHeaderInteractive(interactive);
  }, []);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollOffsetY.value = event.contentOffset.y;

    // Update pointer events state when crossing threshold
    const shouldBeInteractive = event.contentOffset.y > pointerEventsThreshold;
    if (shouldBeInteractive !== wasInteractiveRef.value) {
      wasInteractiveRef.value = shouldBeInteractive;
      runOnJS(updateInteractiveState)(shouldBeInteractive);
    }
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollOffsetY.value,
      [0, threshold],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return {
    scrollOffsetY,
    scrollHandler,
    headerAnimatedStyle,
    isHeaderInteractive,
  };
};
