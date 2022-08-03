/* eslint-disable import/prefer-default-export */
import { IconSize } from '../../Icon';
import { AvatarBaseSize } from '../AvatarBase';

import { IconSizeByAvatarSize } from './AvatarFavicon.types';

export const TEST_IMAGE_URL = 'https://uniswap.org/favicon.ico';

export const FAVICON_AVATAR_IMAGE_ID = 'favicon-avatar-image';

export const ICON_SIZE_BY_AVATAR_SIZE: IconSizeByAvatarSize = {
  [AvatarBaseSize.Xs]: IconSize.Xs,
  [AvatarBaseSize.Sm]: IconSize.Sm,
  [AvatarBaseSize.Md]: IconSize.Md,
  [AvatarBaseSize.Lg]: IconSize.Lg,
  [AvatarBaseSize.Xl]: IconSize.Xl,
};
