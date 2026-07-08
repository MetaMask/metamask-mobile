import type { WithSpringConfig } from 'react-native-reanimated';

export const NOTIFICATION_VISIBILITY_DURATION = 2750;

export const NOTIFICATION_TOP_PADDING = 8;

/**
 * Spring tuned to approximate iOS system banner motion.
 *
 * UIKit reference: `animate(withDuration: 0.5, usingSpringWithDamping: 0.7,
 * initialSpringVelocity: 1)`
 *
 * SwiftUI reference: `.snappy` / `.smooth` with minimal bounce.
 */
export const NOTIFICATION_SPRING_CONFIG: WithSpringConfig = {
  dampingRatio: 0.85,
  duration: 500,
};
