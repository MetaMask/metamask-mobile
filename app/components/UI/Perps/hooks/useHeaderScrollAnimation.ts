import {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const SCROLL_THRESHOLD = 80;

/**
 * Hook for managing scroll-based header animation.
 * Tracks scroll position and provides animated styles for header fade-in effect.
 *
 * @param threshold - Scroll distance (in pixels) at which header fully fades in. Default: 80
 * @returns scrollOffsetY - Shared value tracking current scroll position
 * @returns scrollHandler - Handler to attach to Animated.ScrollView onScroll
 * @returns headerAnimatedStyle - Animated style with opacity based on scroll position
 */
export const useHeaderScrollAnimation = (threshold = SCROLL_THRESHOLD) => {
  const scrollOffsetY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollOffsetY.value = event.contentOffset.y;
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
  };
};
