/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { IconSize } from '../../../../Icon';
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import { IconSizeByAvatarSize } from './AvatarFavicon.types';

export const TEST_REMOTE_IMAGE_URL = 'https://uniswap.org/favicon.ico';

export const TEST_REMOTE_IMAGE_SOURCE: ImageSourcePropType = {
  uri: TEST_REMOTE_IMAGE_URL,
};

/* eslint-disable-next-line */
export const TEST_LOCAL_IMAGE_SOURCE: ImageSourcePropType = require('../../../../../../images/fox.png');

export const FAVICON_AVATAR_IMAGE_ID = 'favicon-avatar-image';

export const ICON_SIZE_BY_AVATAR_SIZE: IconSizeByAvatarSize = {
  [AvatarSize.Xs]: IconSize.Xs,
  [AvatarSize.Sm]: IconSize.Sm,
  [AvatarSize.Md]: IconSize.Md,
  [AvatarSize.Lg]: IconSize.Lg,
  [AvatarSize.Xl]: IconSize.Xl,
};
