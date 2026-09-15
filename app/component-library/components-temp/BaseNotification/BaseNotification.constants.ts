import type { WithSpringConfig } from 'react-native-reanimated';

export const NOTIFICATION_VISIBILITY_DURATION = 2750;
export const NOTIFICATION_TOP_PADDING = 8;
export const NOTIFICATION_SPRING_CONFIG: WithSpringConfig = {
  dampingRatio: 0.85,
  duration: 500,
};

/**
 * Fraction of notification height that must be dragged upward to dismiss.
 */
export const NOTIFICATION_DISMISS_DISTANCE_THRESHOLD = 0.35;

/**
 * Upward velocity (px/s) required to dismiss via a quick swipe.
 */
export const NOTIFICATION_DISMISS_VELOCITY_THRESHOLD = 800;

/**
 * Minimum dismiss distance in px when notification height is not yet measured.
 */
export const NOTIFICATION_DISMISS_MIN_DISTANCE = 24;

/**
 * Minimum upward translation before the pan gesture activates,
 * so taps and button presses still work.
 */
export const NOTIFICATION_SWIPE_ACTIVE_OFFSET_Y = -8;

/**
 * Horizontal movement that fails the pan gesture before it activates,
 * so horizontal scrolls elsewhere are not captured.
 */
export const NOTIFICATION_SWIPE_FAIL_OFFSET_X = 20;
