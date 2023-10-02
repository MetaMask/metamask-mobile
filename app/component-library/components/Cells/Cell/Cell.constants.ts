// External dependencies.
import { AvatarVariants, AvatarAccountType } from '../../Avatars/Avatar';
import { AvatarProps } from '../../Avatars/Avatar/Avatar.types';

// Sample consts
export const SAMPLE_CELL_TITLE = 'Orangefox.eth';
export const SAMPLE_CELL_SECONDARYTEXT =
  '0x2990079bcdEe240329a520d2444386FC119da21a';
export const SAMPLE_CELL_TERTIARY_TEXT = 'Updated 1 sec ago';
export const SAMPLE_CELL_TAGLABEL = 'Imported';
export const SAMPLE_CELL_AVATARPROPS: AvatarProps = {
  variant: AvatarVariants.Account,
  accountAddress: '0x2990079bcdEe240329a520d2444386FC119da21a',
  type: AvatarAccountType.JazzIcon,
};
