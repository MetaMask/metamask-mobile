/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import {
  AvatarProps,
  AvatarVariants,
} from '../../../../Avatars/Avatar/Avatar.types';

export const TEST_REMOTE_IMAGE_SOURCE: ImageSourcePropType = {
  uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
};

export const TEST_AVATAR_PROPS: AvatarProps = {
  variant: AvatarVariants.Network,
  imageSource: TEST_REMOTE_IMAGE_SOURCE,
};
