/* eslint-disable import/prefer-default-export */
// External dependencies.
import { AvatarSize } from '../../Avatar.types';
import { IconSize } from '../../../../Icon';

/**
 * Mapping of IconSize by AvatarSize.
 */
export type IconSizeByAvatarSize = {
  [key in AvatarSize]: IconSize;
};

export const ICON_SIZE_BY_AVATAR_SIZE: IconSizeByAvatarSize = {
  [AvatarSize.Xs]: IconSize.Xs,
  [AvatarSize.Sm]: IconSize.Sm,
  [AvatarSize.Md]: IconSize.Md,
  [AvatarSize.Lg]: IconSize.Lg,
  [AvatarSize.Xl]: IconSize.Xl,
};

export const AVATAR_ICON_TEST_ID = 'avatar-icon';
export const AVATAR_ICON_ICON_TEST_ID = 'avatar-icon-icon';
