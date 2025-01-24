// External dependencies.
import { AvatarVariant, AvatarAccountType } from '../../../../Avatars/Avatar';
import { AvatarProps } from '../../../../Avatars/Avatar/Avatar.types';

// Internal dependencies.
import { CellSelectProps } from './CellSelect.types';

// Sample consts
const SAMPLE_CELLSELECT_TITLE = 'Orangefox.eth';
const SAMPLE_CELLSELECT_SECONDARYTEXT =
  '0x2990079bcdEe240329a520d2444386FC119da21a';
const SAMPLE_CELLSELECT_TERTIARY_TEXT = 'Updated 1 sec ago';
const SAMPLE_CELLSELECT_TAGLABEL = 'Imported';
const SAMPLE_CELLSELECT_AVATARPROPS: AvatarProps = {
  variant: AvatarVariant.Account,
  accountAddress: '0x2990079bcdEe240329a520d2444386FC119da21a',
  type: AvatarAccountType.JazzIcon,
};

export const SAMPLE_CELLSELECT_PROPS: CellSelectProps = {
  title: SAMPLE_CELLSELECT_TITLE,
  secondaryText: SAMPLE_CELLSELECT_SECONDARYTEXT,
  tertiaryText: SAMPLE_CELLSELECT_TERTIARY_TEXT,
  tagLabel: SAMPLE_CELLSELECT_TAGLABEL,
  avatarProps: SAMPLE_CELLSELECT_AVATARPROPS,
  isSelected: false,
  isDisabled: false,
};
