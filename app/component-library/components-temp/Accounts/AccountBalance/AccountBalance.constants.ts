// Third party dependencies.
import { ImageSourcePropType } from 'react-native';
import {
  AvatarProps,
  AvatarVariants,
} from '../../../components/Avatars/Avatar/Avatar.types';
import { AvatarAccountType } from '../../../components/Avatars/Avatar/variants/AvatarAccount';
import {
  BadgeVariants,
  BadgeProps,
} from '../../../components/Badges/Badge/Badge.types';

const imageSource =
  'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880';

export const ACCOUNT_NETWORK = 'Ethereum Network';
export const UNKNOWN_ACCOUNT_NETWORK = 'Unknown Network';
export const ACCOUNT_NAME = 'Account 1';
export const ACCOUNT_BALANCE_LABEL = 'Balance';
export const ACCOUNT_NATIVE_CURRENCY = 'DAI';
export const ACCOUNT_BALANCE = 200.12;
export const TEST_ACCOUNT_ADDRESS =
  '0x2990079bcdEe240329a520d2444386FC119da21a';
export const ACCOUNT_BALANCE_TEST_ID = 'account-balance';
export const TEST_NETWORK_NAME = 'Ethereum';
export const TEST_REMOTE_IMAGE_SOURCE: ImageSourcePropType = {
  uri: imageSource,
};

export const TEST_AVATAR_PROPS: AvatarProps = {
  variant: AvatarVariants.Account,
  accountAddress: TEST_ACCOUNT_ADDRESS,
  type: AvatarAccountType.JazzIcon,
};

export const BADGE_PROPS: BadgeProps = {
  variant: BadgeVariants.Network,
  name: 'Ethereum',
  imageSource: TEST_REMOTE_IMAGE_SOURCE,
};
