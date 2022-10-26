/* eslint-disable import/prefer-default-export */
// External dependencies.
import { TextVariants } from '../../../../Texts/Text';
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import { TextVariantByAvatarSize } from './AvatarInitial.types';

export const TEXT_VARIANT_BY_AVATAR_SIZE: TextVariantByAvatarSize = {
  [AvatarSize.Xs]: TextVariants.sBodySMBold,
  [AvatarSize.Sm]: TextVariants.sBodySMBold,
  [AvatarSize.Md]: TextVariants.sBodyMDBold,
  [AvatarSize.Lg]: TextVariants.sBodyMDBold,
  [AvatarSize.Xl]: TextVariants.sBodyMDBold,
};
