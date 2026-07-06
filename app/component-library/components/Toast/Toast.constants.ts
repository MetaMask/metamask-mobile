import type { WithSpringConfig } from 'react-native-reanimated';
import { ImageSourcePropType } from 'react-native';

import { AvatarAccountType } from '../Avatars/Avatar/variants/AvatarAccount';

export const visibilityDuration = 2750;

export const TOAST_TOP_PADDING = 8;

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
