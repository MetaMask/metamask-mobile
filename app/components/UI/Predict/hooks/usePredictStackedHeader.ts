import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  type SharedValue,
} from 'react-native-reanimated';

export interface UsePredictStackedHeaderResult {
  /** Scroll offset shared value to pass to the stacked header. */
  scrollY: SharedValue<number>;
  /** Measured large-title section height; drives the compact-title timing. */
  titleSectionHeight: SharedValue<number>;
  /** Animated scroll handler for the page's `Animated.ScrollView`. */
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
  /** Reports the measured title section height (from its `onLayout`). */
  setTitleSectionHeight: (height: number) => void;
}

/**
 * Drives the PredictHome stacked/collapsing header.
 *
 * App-side replacement for the design system's `useHeaderStandardAnimated`,
 * whose compiled `onScroll` worklet calls an un-workletized helper
 * (`updateScrollYFromEvent`) and crashes on the UI thread. Here the scroll
 * handler is an inline worklet — workletized by the app's Reanimated Babel
 * plugin — that writes the offset directly. Keeping the shared-value mutation
 * inside this hook (rather than the rendering component) also matches the
 * existing `useFeedScrollManager` / `useDiscoveryScrollManager` convention.
 *
 * The returned `scrollY` / `titleSectionHeight` are passed to
 * `HeaderStandardAnimated` (via `PredictHeaderStacked`).
 */
export const usePredictStackedHeader = (): UsePredictStackedHeaderResult => {
  const scrollY = useSharedValue(0);
  const titleSectionHeight = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset.y;
    },
  });

  const setTitleSectionHeight = useCallback(
    (height: number) => {
      titleSectionHeight.value = height;
    },
    [titleSectionHeight],
  );

  return { scrollY, titleSectionHeight, onScroll, setTitleSectionHeight };
};
