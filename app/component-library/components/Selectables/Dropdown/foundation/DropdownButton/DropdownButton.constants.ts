/* eslint-disable import/prefer-default-export */
// External dependencies.
import { TextVariant, TextColor } from '../../../../Texts/Text';
import { IconName, IconColor, IconSize } from '../../../../Icons/Icon';
import { VerticalAlignment } from '../../../../List/ListItem';
import { AvatarSize } from '../../../../Avatars/Avatar';
import { SAMPLE_AVATAR_PROPS } from '../../../../Avatars/Avatar/Avatar.constants';

// Internal dependencies.
import {
  DropdownButtonSize,
  DropdownButtonProps,
  CaretIconIconSizeByDropdownButtonSize,
  StartIconIconSizeByDropdownButtonSize,
} from './DropdownButton.types';

// Defaults
export const DEFAULT_DROPDOWNBUTTON_GAP = 8;
export const DEFAULT_DROPDOWNBUTTON_VERTICALALIGNMENT =
  VerticalAlignment.Center;
export const DEFAULT_DROPDOWNBUTTON_SIZE = DropdownButtonSize.Md;
export const DEFAULT_DROPDOWNBUTTON_TITLE_TEXTVARIANT = TextVariant.BodyMD;
export const DEFAULT_DROPDOWNBUTTON_TITLE_TEXTCOLOR = TextColor.Default;
export const DEFAULT_DROPDOWNBUTTON_DESCRIPTION_TEXTVARIANT =
  TextVariant.BodySM;
export const DEFAULT_DROPDOWNBUTTON_DESCRIPTION_TEXTCOLOR =
  TextColor.Alternative;
export const DEFAULT_DROPDOWNBUTTON_CARETICON_ICONNAME = IconName.ArrowDown;
export const DEFAULT_DROPDOWNBUTTON_CARETICON_ICONCOLOR = IconColor.Default;

// Test IDs
export const DROPDOWNBUTTON_TESTID = 'dropdownbutton';

// Mappings
export const CARETICON_ICONSIZE_BY_DROPDOWNBUTTONSIZE: CaretIconIconSizeByDropdownButtonSize =
  {
    [DropdownButtonSize.Sm]: IconSize.Xs,
    [DropdownButtonSize.Md]: IconSize.Sm,
    [DropdownButtonSize.Lg]: IconSize.Sm,
  };
export const STARTICON_ICONSIZE_BY_DROPDOWNBUTTONSIZE: StartIconIconSizeByDropdownButtonSize =
  {
    [DropdownButtonSize.Sm]: AvatarSize.Xs,
    [DropdownButtonSize.Md]: AvatarSize.Sm,
    [DropdownButtonSize.Lg]: AvatarSize.Sm,
  };

// Sample consts
export const SAMPLE_DROPDOWNBUTTON_PROPS: DropdownButtonProps = {
  iconProps: SAMPLE_AVATAR_PROPS,
  size: DEFAULT_DROPDOWNBUTTON_SIZE,
  label: 'Sample DropdownButton label',
  isDisabled: false,
  isDanger: false,
};
