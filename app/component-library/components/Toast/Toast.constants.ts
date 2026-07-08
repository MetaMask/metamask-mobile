import type { WithSpringConfig } from 'react-native-reanimated';

export const visibilityDuration = 2750;

export const TOAST_TOP_PADDING = 8;

/**
 * Spring tuned to approximate iOS system banner motion.
 *
 * UIKit reference: `animate(withDuration: 0.5, usingSpringWithDamping: 0.7,
 * initialSpringVelocity: 1)`
 */
export const TOAST_SPRING_CONFIG: WithSpringConfig = {
  dampingRatio: 0.85,
  duration: 500,
};
