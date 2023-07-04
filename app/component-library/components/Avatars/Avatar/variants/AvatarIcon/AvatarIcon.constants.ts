/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { IconSize } from '../../../../Icons/Icon';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import { IconSizeByAvatarSize } from './AvatarIcon.types';

export const ICON_SIZE_BY_AVATAR_SIZE: IconSizeByAvatarSize = {
  [AvatarSize.Xs]: IconSize.Xs,
  [AvatarSize.Sm]: IconSize.Sm,
  [AvatarSize.Md]: IconSize.Md,
  [AvatarSize.Lg]: IconSize.Lg,
  [AvatarSize.Xl]: IconSize.Xl,
};
