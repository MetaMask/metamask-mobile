/* eslint-disable import/prefer-default-export */
// External dependencies.
import { AvatarSizes } from '../../Avatar.types';
import { IconSize } from '../../../../Icon';

/**
 * Mapping of IconSize by AvatarSizes.
 */
export type IconSizeByAvatarSizes = {
  [key in AvatarSizes]: IconSize;
};

export const ICON_SIZE_BY_AVATAR_SIZE: IconSizeByAvatarSizes = {
  [AvatarSizes.Xs]: IconSize.Xs,
  [AvatarSizes.Sm]: IconSize.Sm,
  [AvatarSizes.Md]: IconSize.Md,
  [AvatarSizes.Lg]: IconSize.Lg,
  [AvatarSizes.Xl]: IconSize.Xl,
};

export const AVATAR_ICON_TEST_ID = 'avatar-icon';
export const AVATAR_ICON_ICON_TEST_ID = 'avatar-icon-icon';
