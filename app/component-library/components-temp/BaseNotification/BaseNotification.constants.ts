import type { WithSpringConfig } from 'react-native-reanimated';

export const NOTIFICATION_VISIBILITY_DURATION = 2750;

export const NOTIFICATION_TOP_PADDING = 8;

/**
 * BannerBase-aligned spacing (design-system Box tokens; 1 unit = 4px).
 * @see https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/BannerBase/BannerBase.tsx
 */
export const NOTIFICATION_PADDING_VERTICAL = 12;
export const NOTIFICATION_PADDING_HORIZONTAL = 16;
export const NOTIFICATION_PADDING_RIGHT_WITH_CLOSE_ICON = 8;
export const NOTIFICATION_ROW_GAP = 16;
export const NOTIFICATION_DESCRIPTION_MARGIN_TOP = 2;
export const NOTIFICATION_CLOSE_MARGIN_TOP = -4;

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
