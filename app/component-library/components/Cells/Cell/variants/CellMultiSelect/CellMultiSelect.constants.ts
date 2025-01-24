// External dependencies.
import { AvatarVariant, AvatarAccountType } from '../../../../Avatars/Avatar';
import { AvatarProps } from '../../../../Avatars/Avatar/Avatar.types';

// Internal dependencies.
import { CellMultiSelectProps } from './CellMultiSelect.types';

// Sample consts
const SAMPLE_CELLMULTISELECT_TITLE = 'Orangefox.eth';
const SAMPLE_CELLMULTISELECT_SECONDARYTEXT =
  '0x2990079bcdEe240329a520d2444386FC119da21a';
const SAMPLE_CELLMULTISELECT_TERTIARY_TEXT = 'Updated 1 sec ago';
const SAMPLE_CELLMULTISELECT_TAGLABEL = 'Imported';
const SAMPLE_CELLMULTISELECT_AVATARPROPS: AvatarProps = {
  variant: AvatarVariant.Account,
  accountAddress: '0x2990079bcdEe240329a520d2444386FC119da21a',
  type: AvatarAccountType.JazzIcon,
};

export const SAMPLE_CELLMULTISELECT_PROPS: CellMultiSelectProps = {
  title: SAMPLE_CELLMULTISELECT_TITLE,
  secondaryText: SAMPLE_CELLMULTISELECT_SECONDARYTEXT,
  tertiaryText: SAMPLE_CELLMULTISELECT_TERTIARY_TEXT,
  tagLabel: SAMPLE_CELLMULTISELECT_TAGLABEL,
  avatarProps: SAMPLE_CELLMULTISELECT_AVATARPROPS,
  isSelected: false,
  isDisabled: false,
};
