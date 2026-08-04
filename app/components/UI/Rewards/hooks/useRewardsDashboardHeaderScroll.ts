import { useCallback, useRef } from 'react';
import {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

export interface UseRewardsDashboardHeaderScrollParams {
  /**
   * Updates the native stack header title when the compact title should
   * appear or disappear. Called from the UI thread via `runOnJS`.
   */
  onCompactTitleVisibilityChange: (visible: boolean) => void;
}

export interface UseRewardsDashboardHeaderScrollResult {
  scrollY: SharedValue<number>;
  titleSectionHeight: SharedValue<number>;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
  setTitleSectionHeight: (height: number) => void;
  /** Animated style that fades the large in-content title as it scrolls away. */
  largeTitleAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
}

/**
 * Drives Rewards dashboard's scroll-linked native header title.
 *
 * At rest the large in-content "Rewards" title is visible and the native header
 * title is empty (so only the liquid-glass action buttons show). Once scroll
 * passes the title section, the large title fades out and the native header
 * title is set to "Rewards" (centered).
 *
 * Show/hide uses hysteresis so small scroll adjustments from setting the
 * native title do not immediately flip visibility back off.
 */
export const useRewardsDashboardHeaderScroll = ({
  onCompactTitleVisibilityChange,
}: UseRewardsDashboardHeaderScrollParams): UseRewardsDashboardHeaderScrollResult => {
  const scrollY = useSharedValue(0);
  const titleSectionHeight = useSharedValue(0);
  const isCompactTitleVisible = useSharedValue(false);
  // Keep a stable JS callback reference for runOnJS — the scroll worklet
  // must not capture a changing closure that goes stale mid-gesture.
  const onVisibilityChangeRef = useRef(onCompactTitleVisibilityChange);
  onVisibilityChangeRef.current = onCompactTitleVisibilityChange;

  const notifyVisibilityChange = useCallback((visible: boolean) => {
    onVisibilityChangeRef.current(visible);
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const offsetY = event.contentOffset.y;
      scrollY.value = offsetY;

      const threshold = titleSectionHeight.value;
      if (threshold <= 0) {
        return;
      }

      // Hysteresis: show once fully past the title, hide only after scrolling
      // meaningfully back — avoids flicker when setOptions adjusts layout.
      const showAt = threshold;
      const hideAt = threshold * 0.35;
      const currentlyVisible = isCompactTitleVisible.value;

      if (!currentlyVisible && offsetY >= showAt) {
        isCompactTitleVisible.value = true;
        runOnJS(notifyVisibilityChange)(true);
      } else if (currentlyVisible && offsetY < hideAt) {
        isCompactTitleVisible.value = false;
        runOnJS(notifyVisibilityChange)(false);
      }
    },
  });

  const setTitleSectionHeight = useCallback(
    (height: number) => {
      titleSectionHeight.value = height;
    },
    [titleSectionHeight],
  );

  const largeTitleAnimatedStyle = useAnimatedStyle(() => {
    const height = titleSectionHeight.value || 1;
    return {
      opacity: interpolate(
        scrollY.value,
        [0, height * 0.5, height],
        [1, 0.4, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  return {
    scrollY,
    titleSectionHeight,
    onScroll,
    setTitleSectionHeight,
    largeTitleAnimatedStyle,
  };
};
