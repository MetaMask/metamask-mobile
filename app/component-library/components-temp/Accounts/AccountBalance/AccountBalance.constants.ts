// Third party dependencies.
import { ImageSourcePropType } from 'react-native';
import {
  BadgeVariant,
  BadgeProps,
} from '../../../components/Badges/Badge/Badge.types';

const imageSource =
  'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880';

export const TEST_ACCOUNT_ADDRESS =
  '0x2990079bcdEe240329a520d2444386FC119da21a';
export const ACCOUNT_BALANCE_TEST_ID = 'account-balance';
const TEST_REMOTE_IMAGE_SOURCE: ImageSourcePropType = {
  uri: imageSource,
};

export const BADGE_PROPS: BadgeProps = {
  variant: BadgeVariant.Network,
  name: 'Ethereum',
  imageSource: TEST_REMOTE_IMAGE_SOURCE,
};
