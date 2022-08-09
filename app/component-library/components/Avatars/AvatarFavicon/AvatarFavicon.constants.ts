/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { IconSize } from '../../Icon';
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import { IconSizeByAvatarSize } from './AvatarFavicon.types';

export const TEST_IMAGE_URL = 'https://uniswap.org/favicon.ico';

export const TEST_IMAGE_SOURCE: ImageSourcePropType = {
  uri: TEST_IMAGE_URL,
};

export const FAVICON_AVATAR_IMAGE_ID = 'favicon-avatar-image';

export const ICON_SIZE_BY_AVATAR_SIZE: IconSizeByAvatarSize = {
  [AvatarBaseSize.Xs]: IconSize.Xs,
  [AvatarBaseSize.Sm]: IconSize.Sm,
  [AvatarBaseSize.Md]: IconSize.Md,
  [AvatarBaseSize.Lg]: IconSize.Lg,
  [AvatarBaseSize.Xl]: IconSize.Xl,
};
