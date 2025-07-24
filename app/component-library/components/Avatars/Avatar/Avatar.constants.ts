/* eslint-disable import/prefer-default-export */
// External dependencies.
import { IconSize } from '../../Icons/Icon';
import { SAMPLE_AVATARACCOUNT_PROPS } from './variants/AvatarAccount/AvatarAccount.constants';

// Internal dependencies.
import {
  AvatarProps,
  AvatarSize,
  AvatarVariant,
  IconSizeByAvatarSize,
  BorderWidthByAvatarSize,
} from './Avatar.types';

// Mappings
export const ICONSIZE_BY_AVATARSIZE: IconSizeByAvatarSize = {
  [AvatarSize.Xs]: IconSize.Xs,
  [AvatarSize.Sm]: IconSize.Sm,
  [AvatarSize.Md]: IconSize.Md,
  [AvatarSize.Lg]: IconSize.Lg,
  [AvatarSize.Xl]: IconSize.Xl,
};

export const BORDERWIDTH_BY_AVATARSIZE: BorderWidthByAvatarSize = {
  [AvatarSize.Xs]: 1.5,
  [AvatarSize.Sm]: 2,
  [AvatarSize.Md]: 3,
  [AvatarSize.Lg]: 3,
  [AvatarSize.Xl]: 3,
};

// Sample consts
export const SAMPLE_AVATAR_PROPS: AvatarProps = {
  variant: AvatarVariant.Account,
  ...SAMPLE_AVATARACCOUNT_PROPS,
};
