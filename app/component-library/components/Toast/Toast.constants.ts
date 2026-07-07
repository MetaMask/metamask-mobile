import type { WithSpringConfig } from 'react-native-reanimated';

export const visibilityDuration = 2750;

export const TOAST_TOP_PADDING = 8;

/**
 * BannerBase-aligned spacing (design-system Box tokens; 1 unit = 4px).
 * @see https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/BannerBase/BannerBase.tsx
 */
export const TOAST_PADDING_VERTICAL = 12;
export const TOAST_PADDING_BOTTOM_WITH_ACTION = 16;
export const TOAST_PADDING_HORIZONTAL = 16;
export const TOAST_PADDING_RIGHT_WITH_CLOSE_ICON = 8;
export const TOAST_ROW_GAP = 16;
/** Circular background for icon toasts when `backgroundColor` is set (24px icon inside). */
export const TOAST_ICON_BACKGROUND_SIZE = 32;
export const TOAST_ACTION_MARGIN_TOP = 8;
export const TOAST_DESCRIPTION_MARGIN_TOP = 2;
export const TOAST_CLOSE_MARGIN_TOP = -4;

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
