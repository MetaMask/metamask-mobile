import { useState, useCallback, useLayoutEffect } from 'react';
import { View, Platform, LayoutChangeEvent } from 'react-native';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  SharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

// =============================================================================
// TYPES
// =============================================================================

export interface UseFeedScrollManagerParams {
  headerRef: React.RefObject<View>;
  tabBarRef: React.RefObject<View>;
}

export interface UseFeedScrollManagerReturn {
  headerTranslateY: SharedValue<number>;
  headerHidden: boolean;
  headerHeight: number;
  tabBarHeight: number;
  layoutReady: boolean;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  onHeaderLayout: (event: LayoutChangeEvent) => void;
  onTabBarLayout: (event: LayoutChangeEvent) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Duration of header show/hide animation in milliseconds.
 */
export const HEADER_ANIMATION_DURATION = 450;

/**
 * Accumulated scroll distance (in pixels) required before triggering header show/hide.
 * This prevents accidental triggers from small scroll movements.
 */
export const SCROLL_THRESHOLD = 250;

// =============================================================================
// HOOK
// =============================================================================

/**
 * Manages time-based header animation with binary show/hide states.
 * Scroll direction triggers animated transitions - header is always fully visible or hidden.
 *
 * Features:
 * - Binary state: Header is either fully visible (translateY: 0) or fully hidden (translateY: -headerHeight)
 * - Threshold-based triggering: Requires SCROLL_THRESHOLD pixels of scroll before toggling
 * - Direction change reset: Accumulated delta resets when scroll direction changes
 * - Tab switch handling: Skips first scroll event after tab switch to prevent false triggers
 * - Platform-aware: Handles iOS contentInset vs Android paddingTop differences
 *
 * @param params.headerRef - Ref to the header (balance card) View for height measurement
 * @param params.tabBarRef - Ref to the tab bar View for height measurement
 * @returns Scroll state and handlers for coordinating header animation
 */
export const useFeedScrollManager = ({
  headerRef,
  tabBarRef,
}: UseFeedScrollManagerParams): UseFeedScrollManagerReturn => {
  // Header state: 0 = visible, 1 = hidden (binary, not continuous)
  const isHeaderHidden = useSharedValue(0);
  // Header translateY: 0 = visible, -headerHeight = hidden
  const headerTranslateY = useSharedValue(0);

  // Shared values for worklet access
  const sharedHeaderHeight = useSharedValue(0);
  const sharedTabBarHeight = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  // Flag to skip direction detection on first scroll after tab switch
  const isTabSwitching = useSharedValue(false);

  // Track accumulated scroll delta for threshold detection
  const accumulatedDelta = useSharedValue(0);
  const lastDirection = useSharedValue(0); // 1 = down, -1 = up, 0 = none

  // Layout measurements (JS side)
  const [headerHeight, setHeaderHeight] = useState(0);
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);

  // Tab state
  const [activeIndex, setActiveIndex] = useState(0);

  // React state mirror of isHeaderHidden for reactive UI updates
  const [headerHidden, setHeaderHidden] = useState(false);

  useLayoutEffect(() => {
    if (headerRef.current) {
      headerRef.current.measure((_x, _y, _width, height) => {
        if (height > 0) {
          setHeaderHeight(height);
          sharedHeaderHeight.value = height;
        }
      });
    }

    if (tabBarRef.current) {
      tabBarRef.current.measure((_x, _y, _width, height) => {
        if (height > 0) {
          setTabBarHeight(height);
          sharedTabBarHeight.value = height;
        }
      });
    }
  }, [headerRef, tabBarRef, sharedHeaderHeight, sharedTabBarHeight]);

  useLayoutEffect(() => {
    setLayoutReady(headerHeight > 0 && tabBarHeight > 0);
  }, [headerHeight, tabBarHeight]);

  const onHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0 && height !== sharedHeaderHeight.value) {
        setHeaderHeight(height);
        sharedHeaderHeight.value = height;
      }
    },
    [sharedHeaderHeight],
  );

  const onTabBarLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0 && height !== sharedTabBarHeight.value) {
        setTabBarHeight(height);
        sharedTabBarHeight.value = height;
      }
    },
    [sharedTabBarHeight],
  );

  const animationConfig = {
    duration: HEADER_ANIMATION_DURATION,
    easing: Easing.out(Easing.cubic),
  };

  // Time-based scroll handler: detect direction, animate to show/hide
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const currentY = event.contentOffset.y;

      if (isTabSwitching.value) {
        isTabSwitching.value = false;
        lastScrollY.value = currentY;
        accumulatedDelta.value = 0;
        lastDirection.value = 0;
        return;
      }

      // This fixes an issue on Android where the scroll event fires after the header hides
      // and was causing the header to be shown again.
      if (lastDirection.value === 1 && currentY < lastScrollY.value) {
        lastDirection.value = 0;
        lastScrollY.value = currentY;
        return;
      }

      const delta = currentY - lastScrollY.value;
      lastScrollY.value = currentY;

      // At top of list - always show header
      const contentInsetTop =
        sharedHeaderHeight.value + sharedTabBarHeight.value;
      const atTop =
        Platform.OS === 'ios' ? currentY < 0 : currentY < contentInsetTop;

      const currentDirection = delta > 0 ? 1 : delta < 0 ? -1 : 0;
      if (currentDirection === 0) return;

      if (currentDirection !== lastDirection.value) {
        lastDirection.value = currentDirection;
        accumulatedDelta.value = 0;
      }

      accumulatedDelta.value += Math.abs(delta);

      if (atTop && isHeaderHidden.value === 1 && currentDirection === -1) {
        isHeaderHidden.value = 0;
        headerTranslateY.value = withTiming(0, animationConfig);
        accumulatedDelta.value = 0;
        lastDirection.value = 0;
        runOnJS(setHeaderHidden)(false);
        return;
      }

      if (accumulatedDelta.value < SCROLL_THRESHOLD) {
        return;
      }

      // Scrolling down -> hide header
      if (currentDirection === 1 && isHeaderHidden.value === 0) {
        isHeaderHidden.value = 1;
        headerTranslateY.value = withTiming(
          -sharedHeaderHeight.value,
          animationConfig,
        );
        accumulatedDelta.value = 0;
        runOnJS(setHeaderHidden)(true);
      }

      // Scrolling up -> show header
      if (currentDirection === -1 && isHeaderHidden.value === 1) {
        isHeaderHidden.value = 0;
        headerTranslateY.value = withTiming(0, animationConfig);
        accumulatedDelta.value = 0;
        runOnJS(setHeaderHidden)(false);
      }
    },
  });

  const handleSetActiveIndex = useCallback(
    (index: number) => {
      isTabSwitching.value = true;
      setActiveIndex(index);
    },
    [isTabSwitching],
  );

  return {
    headerTranslateY,
    headerHidden,
    headerHeight,
    tabBarHeight,
    layoutReady,
    activeIndex,
    setActiveIndex: handleSetActiveIndex,
    scrollHandler,
    onHeaderLayout,
    onTabBarLayout,
  };
};
