// External dependencies.
import type { NativeScrollEvent } from 'react-native';
import { SharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';

// Internal dependencies.
import { HeaderCompactStandardProps } from '../HeaderCompactStandard/HeaderCompactStandard.types';

/**
 * Optional JS callback for scroll events. Called via runOnJS from the worklet
 * so UI-thread scrollY update remains lag-free.
 */
export type HeaderStandardAnimatedScrollJsCallback = (event: {
  nativeEvent: NativeScrollEvent;
}) => void;

/**
 * HeaderStandardAnimated component props.
 * Extends HeaderCompactStandardProps with scroll-driven animation inputs.
 * Content is driven by title/subtitle only; children is not supported.
 */
export interface HeaderStandardAnimatedProps
  extends Omit<HeaderCompactStandardProps, 'children'> {
  /**
   * Shared value for scroll offset from the ScrollView.
   * Used to drive the center-title animation when scroll passes the title section.
   */
  scrollY: SharedValue<number>;
  /**
   * Shared value for the height of the title section (first child of ScrollView).
   * When scrollY >= titleSectionHeight, the compact center title is shown.
   */
  titleSectionHeight: SharedValue<number>;
}

/**
 * Options for useHeaderStandardAnimated.
 */
export interface UseHeaderStandardAnimatedOptions {
  /**
   * Optional JS-thread callback invoked on scroll (via runOnJS).
   * Use for analytics/tracking; scrollY is still updated on the UI thread.
   */
  onScrollJs?: HeaderStandardAnimatedScrollJsCallback;
}

/**
 * Return type for useHeaderStandardAnimated hook.
 * onScroll is an animated scroll handler; use with Animated.ScrollView for UI-thread updates.
 */
export interface UseHeaderStandardAnimatedReturn {
  scrollY: SharedValue<number>;
  titleSectionHeightSv: SharedValue<number>;
  setTitleSectionHeight: (height: number) => void;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
}
