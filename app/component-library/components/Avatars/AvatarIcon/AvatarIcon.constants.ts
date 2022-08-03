/* eslint-disable import/prefer-default-export */
import { IconSize } from '../../Icon';

import { AvatarBaseSize } from '../AvatarBase';

import { IconSizeByAvatarSize } from './AvatarIcon.types';

export const ICON_SIZE_BY_AVATAR_SIZE: IconSizeByAvatarSize = {
  [AvatarBaseSize.Xs]: IconSize.Xs,
  [AvatarBaseSize.Sm]: IconSize.Sm,
  [AvatarBaseSize.Md]: IconSize.Md,
  [AvatarBaseSize.Lg]: IconSize.Lg,
  [AvatarBaseSize.Xl]: IconSize.Xl,
};
