// External dependencies.
import { IconName } from '../../../component-library/components/Icons/Icon';
import {
  AvatarVariant,
  AvatarAccountType,
} from '../../../component-library/components/Avatars/Avatar';
import { AvatarProps } from '../../../component-library/components/Avatars/Avatar/Avatar.types';

// Internal dependencies.
import { CellSelectWithMenuProps } from './CellSelectWithMenu.types';

// Sample consts
const SAMPLE_CELLSELECT_WITH_BUTTON_TITLE = 'Orangefox.eth';
const SAMPLE_CELLSELECT_WITH_BUTTON_SECONDARYTEXT =
  '0x2990079bcdEe240329a520d2444386FC119da21a';
const SAMPLE_CELLSELECT_WITH_BUTTON_TERTIARY_TEXT = 'Updated 1 sec ago';
const SAMPLE_CELLSELECT_WITH_BUTTON_TAGLABEL = 'Imported';
const SAMPLE_CELLSELECT_WITH_BUTTON_AVATARPROPS: AvatarProps = {
  variant: AvatarVariant.Account,
  accountAddress: '0x2990079bcdEe240329a520d2444386FC119da21a',
  type: AvatarAccountType.JazzIcon,
};

// eslint-disable-next-line import/prefer-default-export
export const SAMPLE_CELLSELECT_WITH_BUTTON_PROPS: CellSelectWithMenuProps = {
  title: SAMPLE_CELLSELECT_WITH_BUTTON_TITLE,
  secondaryText: SAMPLE_CELLSELECT_WITH_BUTTON_SECONDARYTEXT,
  tertiaryText: SAMPLE_CELLSELECT_WITH_BUTTON_TERTIARY_TEXT,
  tagLabel: SAMPLE_CELLSELECT_WITH_BUTTON_TAGLABEL,
  avatarProps: SAMPLE_CELLSELECT_WITH_BUTTON_AVATARPROPS,
  isSelected: false,
  isDisabled: false,
  buttonIcon: IconName.MoreVertical,
};
