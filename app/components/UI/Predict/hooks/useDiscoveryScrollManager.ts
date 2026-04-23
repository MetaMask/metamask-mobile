import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  SharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

export const ANIMATION_DURATION = 350;
export const SCROLL_THRESHOLD = 80;

const animationConfig = {
  duration: ANIMATION_DURATION,
  easing: Easing.out(Easing.cubic),
};

interface UseDiscoveryScrollManagerParams {
  walletHeaderHeight: number;
  walletHeaderTranslateY?: SharedValue<number>;
  onPortfolioScroll?: () => void;
}

interface UseDiscoveryScrollManagerReturn {
  headerHidden: boolean;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  onTabSwitch: () => void;
}

export const useDiscoveryScrollManager = ({
  walletHeaderHeight,
  walletHeaderTranslateY: externalTranslateY,
  onPortfolioScroll,
}: UseDiscoveryScrollManagerParams): UseDiscoveryScrollManagerReturn => {
  const fallbackTranslateY = useSharedValue(0);
  const walletHeaderTranslateY = externalTranslateY ?? fallbackTranslateY;
  const isHeaderHidden = useSharedValue(0);
  const sharedHeaderHeight = useSharedValue(walletHeaderHeight);
  const lastScrollY = useSharedValue(0);
  const accumulatedDelta = useSharedValue(0);
  const lastDirection = useSharedValue(0);
  const isTabSwitching = useSharedValue(false);

  const [headerHidden, setHeaderHidden] = useState(false);

  // Keep shared height in sync as it's measured after first render
  useEffect(() => {
    sharedHeaderHeight.value = walletHeaderHeight;
  }, [walletHeaderHeight, sharedHeaderHeight]);

  // Stable ref so the worklet can call the latest onPortfolioScroll without
  // recreating the scroll handler on every render.
  const onPortfolioScrollRef = useRef<(() => void) | undefined>(undefined);
  onPortfolioScrollRef.current = onPortfolioScroll;
  const callPortfolioScroll = useCallback(() => {
    onPortfolioScrollRef.current?.();
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';

      // Forward to the section-visibility tracking subscribers
      runOnJS(callPortfolioScroll)();

      const currentY = event.contentOffset.y;

      // Skip first event after a tab switch to avoid false triggers from
      // PagerView-style scroll settling.
      if (isTabSwitching.value) {
        isTabSwitching.value = false;
        lastScrollY.value = currentY;
        accumulatedDelta.value = 0;
        lastDirection.value = 0;
        return;
      }

      const delta = currentY - lastScrollY.value;
      lastScrollY.value = currentY;

      const atTop = currentY <= 0;
      const currentDirection = delta > 0 ? 1 : delta < 0 ? -1 : 0;
      if (currentDirection === 0) return;

      // Reset accumulated delta when direction reverses
      if (currentDirection !== lastDirection.value) {
        lastDirection.value = currentDirection;
        accumulatedDelta.value = 0;
      }

      accumulatedDelta.value += Math.abs(delta);

      // Always show header when at the top of the list
      if (atTop && isHeaderHidden.value === 1) {
        isHeaderHidden.value = 0;
        walletHeaderTranslateY.value = withTiming(0, animationConfig);
        accumulatedDelta.value = 0;
        lastDirection.value = 0;
        runOnJS(setHeaderHidden)(false);
        return;
      }

      if (accumulatedDelta.value < SCROLL_THRESHOLD) return;

      // Scroll down — hide header
      if (currentDirection === 1 && isHeaderHidden.value === 0) {
        isHeaderHidden.value = 1;
        walletHeaderTranslateY.value = withTiming(
          -sharedHeaderHeight.value,
          animationConfig,
        );
        accumulatedDelta.value = 0;
        runOnJS(setHeaderHidden)(true);
      }

      // Scroll up — show header
      if (currentDirection === -1 && isHeaderHidden.value === 1) {
        isHeaderHidden.value = 0;
        walletHeaderTranslateY.value = withTiming(0, animationConfig);
        accumulatedDelta.value = 0;
        runOnJS(setHeaderHidden)(false);
      }
    },
  });

  // Show the header again when the user switches tabs
  const onTabSwitch = useCallback(() => {
    isTabSwitching.value = true;
    if (isHeaderHidden.value === 1) {
      isHeaderHidden.value = 0;
      walletHeaderTranslateY.value = withTiming(0, animationConfig);
      runOnJS(setHeaderHidden)(false);
    }
  }, [isTabSwitching, isHeaderHidden, walletHeaderTranslateY]);

  return { headerHidden, scrollHandler, onTabSwitch };
};
