/* eslint-disable import/prefer-default-export */
// External dependencies.
import { AvatarSize } from './Avatar2.types';
import { IconSize } from '../../Icon';

/**
 * Mapping of IconSize by AvatarSize.
 */
export type IconSizeByAvatarSize = {
  [key in AvatarSize]: IconSize;
};

export const ICON_SIZE_BY_AVATAR_SIZE: IconSizeByAvatarSize = {
  [AvatarSize.Xs]: IconSize.Sm,
  [AvatarSize.Sm]: IconSize.Lg,
  [AvatarSize.Md]: IconSize.Xl,
  [AvatarSize.Lg]: IconSize.Xl,
  [AvatarSize.Xl]: IconSize.Xl,
};
