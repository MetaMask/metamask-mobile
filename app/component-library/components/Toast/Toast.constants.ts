import type { WithSpringConfig } from 'react-native-reanimated';

export const visibilityDuration = 2750;

/**
 * Spring tuned to approximate iOS system banner motion.
 *
 * UIKit reference: `animate(withDuration: 0.5, usingSpringWithDamping: 0.7,
 * initialSpringVelocity: 1)`
 *
 * SwiftUI reference: `.snappy` / `.smooth` with minimal bounce.
 */
export const TOAST_SPRING_CONFIG: WithSpringConfig = {
  dampingRatio: 0.85,
  duration: 500,
};

/**
 * Fraction of toast height that must be dragged upward to dismiss.
 */
export const TOAST_DISMISS_DISTANCE_THRESHOLD = 0.35;

/**
 * Upward velocity (px/s) required to dismiss via a quick swipe.
 */
export const TOAST_DISMISS_VELOCITY_THRESHOLD = 800;

/**
 * Minimum upward translation before the pan gesture activates,
 * so taps and button presses still work.
 */
export const TOAST_SWIPE_ACTIVE_OFFSET_Y = -8;

/**
 * Horizontal movement that fails the pan gesture before it activates,
 * so horizontal scrolls elsewhere are not captured.
 */
export const TOAST_SWIPE_FAIL_OFFSET_X = 20;
