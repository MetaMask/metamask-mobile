import type { WithSpringConfig } from 'react-native-reanimated';
import { ImageSourcePropType } from 'react-native';

import { AvatarAccountType } from '../Avatars/Avatar/variants/AvatarAccount';

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

export const TEST_ACCOUNT_ADDRESS =
  '0x2990079bcdEe240329a520d2444386FC119da21a';

export const TEST_AVATAR_TYPE = AvatarAccountType.JazzIcon;

export const TEST_NETWORK_NAME = 'Ethereum Mainnet';

export const TEST_NETWORK_IMAGE_URL =
  'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880';

export const TEST_NETWORK_IMAGE_SOURCE: ImageSourcePropType = {
  uri: TEST_NETWORK_IMAGE_URL,
};

export const TEST_APP_ICON_SOURCE: ImageSourcePropType = {
  uri: 'https://app.uniswap.org/favicon.ico',
};

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
