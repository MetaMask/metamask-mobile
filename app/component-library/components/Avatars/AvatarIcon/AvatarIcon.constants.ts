/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { IconSize } from '../../Icon';

// External dependencies.
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import { IconSizeByAvatarSize } from './AvatarIcon.types';

export const ICON_SIZE_BY_AVATAR_SIZE: IconSizeByAvatarSize = {
  [AvatarBaseSize.Xs]: IconSize.Xs,
  [AvatarBaseSize.Sm]: IconSize.Sm,
  [AvatarBaseSize.Md]: IconSize.Md,
  [AvatarBaseSize.Lg]: IconSize.Lg,
  [AvatarBaseSize.Xl]: IconSize.Xl,
};
