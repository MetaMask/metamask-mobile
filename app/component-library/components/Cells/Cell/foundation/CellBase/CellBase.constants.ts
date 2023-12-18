// External dependencies.
import {
  AvatarSize,
  AvatarVariant,
  AvatarAccountType,
} from '../../../../Avatars/Avatar';
import { AvatarProps } from '../../../../Avatars/Avatar/Avatar.types';
import { TextVariant } from '../../../../Texts/Text';

// Defaults
export const DEFAULT_CELLBASE_AVATAR_SIZE = AvatarSize.Md;
export const DEFAULT_CELLBASE_AVATAR_TITLE_TEXTVARIANT =
  TextVariant.HeadingSMRegular;
export const DEFAULT_CELLBASE_AVATAR_SECONDARYTEXT_TEXTVARIANT =
  TextVariant.BodyMD;
export const DEFAULT_CELLBASE_AVATAR_TERTIARYTEXT_TEXTVARIANT =
  TextVariant.BodyMD;

// Sample consts
export const SAMPLE_CELLBASE_TITLE = 'Orangefox.eth';
export const SAMPLE_CELLBASE_SECONDARYTEXT =
  '0x2990079bcdEe240329a520d2444386FC119da21a';
export const SAMPLE_CELLBASE_TERTIARY_TEXT = 'Updated 1 sec ago';
export const SAMPLE_CELLBASE_TAGLABEL = 'Imported';
export const SAMPLE_CELLBASE_AVATARPROPS: AvatarProps = {
  variant: AvatarVariant.Account,
  accountAddress: '0x2990079bcdEe240329a520d2444386FC119da21a',
  type: AvatarAccountType.JazzIcon,
};
