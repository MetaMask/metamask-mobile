import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  SharedValue,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

export const ANIMATION_DURATION = 300;
export const SCROLL_THRESHOLD = 100;

const hideAnimationConfig = {
  duration: ANIMATION_DURATION,
  easing: Easing.out(Easing.cubic),
};

const showAnimationConfig = {
  duration: 250,
  easing: Easing.out(Easing.cubic),
};

interface UseDiscoveryScrollManagerParams {
  walletHeaderHeight: number;
  walletHeaderTranslateY?: SharedValue<number>;
  onPortfolioScroll?: () => void;
  /**
   * Called from the scroll worklet (via runOnJS) with the current scroll Y and
   * viewport height. Use this to forward events to JS-thread scroll handlers
   * (e.g. analytics section tracking) without needing a separate ScrollView.
   */
  onScrollEvent?: (scrollY: number, viewportHeight: number) => void;
  /**
   * Called via runOnJS at the exact moment the hide/show decision is made —
   * same worklet frame as the withTiming call. Use this to sync sibling
   * animations (e.g. icon collapse) without position-based polling.
   */
  onHeaderHiddenChange?: (hidden: boolean) => void;
}

interface UseDiscoveryScrollManagerReturn {
  headerHidden: boolean;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  onTabEnter: () => void;
}

export const useDiscoveryScrollManager = ({
  walletHeaderHeight,
  walletHeaderTranslateY: externalTranslateY,
  onPortfolioScroll,
  onScrollEvent,
  onHeaderHiddenChange,
}: UseDiscoveryScrollManagerParams): UseDiscoveryScrollManagerReturn => {
  const fallbackTranslateY = useSharedValue(0);
  const walletHeaderTranslateY = externalTranslateY ?? fallbackTranslateY;
  const isHeaderHidden = useSharedValue(0);
  const sharedHeaderHeight = useSharedValue(walletHeaderHeight);
  const lastScrollY = useSharedValue(0);
  const accumulatedDelta = useSharedValue(0);
  const lastDirection = useSharedValue(0);
  // Number of scroll events to ignore after a tab switch. Using a counter
  // instead of a boolean handles multiple settling events that fire when
  // views stay mounted (opacity approach) and are switching back into view.
  const tabSwitchEventsToSkip = useSharedValue(0);

  const [headerHidden, setHeaderHidden] = useState(false);

  // Keep shared height in sync as it's measured after first render
  useEffect(() => {
    sharedHeaderHeight.value = walletHeaderHeight;
  }, [walletHeaderHeight, sharedHeaderHeight]);

  // Stable refs so worklets can call the latest callbacks without recreating
  // the scroll handler on every render.
  const onPortfolioScrollRef = useRef<(() => void) | undefined>(undefined);
  onPortfolioScrollRef.current = onPortfolioScroll;
  const callPortfolioScroll = useCallback(() => {
    onPortfolioScrollRef.current?.();
  }, []);

  const onScrollEventRef = useRef<
    ((scrollY: number, viewportHeight: number) => void) | undefined
  >(undefined);
  onScrollEventRef.current = onScrollEvent;
  const callScrollEvent = useCallback(
    (scrollY: number, viewportHeight: number) => {
      onScrollEventRef.current?.(scrollY, viewportHeight);
    },
    [],
  );

  const onHeaderHiddenChangeRef = useRef<
    ((hidden: boolean) => void) | undefined
  >(undefined);
  onHeaderHiddenChangeRef.current = onHeaderHiddenChange;
  const callHeaderHiddenChange = useCallback((hidden: boolean) => {
    onHeaderHiddenChangeRef.current?.(hidden);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';

      // Forward to the section-visibility tracking subscribers
      runOnJS(callPortfolioScroll)();

      const currentY = event.contentOffset.y;
      runOnJS(callScrollEvent)(currentY, event.layoutMeasurement.height);

      // Skip settling events after a tab switch. Multiple events can fire
      // when views remain mounted (opacity approach) and settle back into view.
      if (tabSwitchEventsToSkip.value > 0) {
        tabSwitchEventsToSkip.value -= 1;
        lastScrollY.value = currentY;
        accumulatedDelta.value = 0;
        lastDirection.value = 0;
        return;
      }

      const delta = currentY - lastScrollY.value;
      lastScrollY.value = currentY;

      const atTop = currentY <= 0;
      const maxScrollY =
        event.contentSize.height - event.layoutMeasurement.height;
      const atBottom = maxScrollY > 0 && currentY >= maxScrollY;

      // Ignore bounce events past the bottom edge — the snapback registers as
      // an upward scroll and would falsely trigger the show-header logic.
      if (atBottom) {
        accumulatedDelta.value = 0;
        return;
      }

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
        walletHeaderTranslateY.value = withTiming(0, showAnimationConfig);
        accumulatedDelta.value = 0;
        lastDirection.value = 0;
        runOnJS(setHeaderHidden)(false);
        runOnJS(callHeaderHiddenChange)(false);
        return;
      }

      if (accumulatedDelta.value < SCROLL_THRESHOLD) return;

      // Scroll down — hide header
      if (currentDirection === 1 && isHeaderHidden.value === 0) {
        isHeaderHidden.value = 1;
        walletHeaderTranslateY.value = withTiming(
          -sharedHeaderHeight.value,
          hideAnimationConfig,
        );
        accumulatedDelta.value = 0;
        runOnJS(setHeaderHidden)(true);
        runOnJS(callHeaderHiddenChange)(true);
      }

      // Scroll up — show header
      if (currentDirection === -1 && isHeaderHidden.value === 1) {
        isHeaderHidden.value = 0;
        walletHeaderTranslateY.value = withTiming(0, showAnimationConfig);
        accumulatedDelta.value = 0;
        runOnJS(setHeaderHidden)(false);
        runOnJS(callHeaderHiddenChange)(false);
      }
    },
  });

  // Restore this tab's header state when the user enters it.
  // If this tab was previously scrolled with the header hidden, keep it hidden.
  // If this tab is at the top (or hasn't been visited), show the header.
  const onTabEnter = useCallback(() => {
    tabSwitchEventsToSkip.value = 5;
    if (isHeaderHidden.value === 1) {
      walletHeaderTranslateY.value = withDelay(
        100,
        withTiming(-sharedHeaderHeight.value, hideAnimationConfig),
      );
      setHeaderHidden(true);
      callHeaderHiddenChange(true);
    } else {
      walletHeaderTranslateY.value = withTiming(0, showAnimationConfig);
      setHeaderHidden(false);
      callHeaderHiddenChange(false);
    }
  }, [
    tabSwitchEventsToSkip,
    isHeaderHidden,
    walletHeaderTranslateY,
    sharedHeaderHeight,
    callHeaderHiddenChange,
  ]);

  return { headerHidden, scrollHandler, onTabEnter };
};
