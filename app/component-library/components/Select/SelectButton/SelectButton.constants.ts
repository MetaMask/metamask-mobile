/* eslint-disable import/prefer-default-export */
// External dependencies.
import { TextVariant, TextColor } from '../../Texts/Text';
import { IconName, IconColor, IconSize } from '../../Icons/Icon';
import { VerticalAlignment } from '../../List/ListItem';
import { AvatarSize } from '../../Avatars/Avatar';
import { SAMPLE_AVATAR_PROPS } from '../../Avatars/Avatar/Avatar.constants';

// Internal dependencies.
import {
  SelectButtonSize,
  SelectButtonProps,
  CaretIconIconSizeBySelectButtonSize,
  StartIconIconSizeBySelectButtonSize,
} from './SelectButton.types';

// Defaults
export const DEFAULT_SELECTBUTTON_GAP = 8;
export const DEFAULT_SELECTBUTTON_VERTICALALIGNMENT = VerticalAlignment.Center;
export const DEFAULT_SELECTBUTTON_SIZE = SelectButtonSize.Md;
export const DEFAULT_SELECTBUTTON_TITLE_TEXTVARIANT = TextVariant.BodyMD;
export const DEFAULT_SELECTBUTTON_TITLE_TEXTCOLOR = TextColor.Default;
export const DEFAULT_SELECTBUTTON_DESCRIPTION_TEXTVARIANT = TextVariant.BodySM;
export const DEFAULT_SELECTBUTTON_DESCRIPTION_TEXTCOLOR = TextColor.Alternative;
export const DEFAULT_SELECTBUTTON_CARETICON_ICONNAME = IconName.ArrowDown;
export const DEFAULT_SELECTBUTTON_CARETICON_ICONCOLOR = IconColor.Default;

// Test IDs
export const SELECTBUTTON_TESTID = 'selectbutton';

// Mappings
export const CARETICON_ICONSIZE_BY_SELECTBUTTONSIZE: CaretIconIconSizeBySelectButtonSize =
  {
    [SelectButtonSize.Sm]: IconSize.Xs,
    [SelectButtonSize.Md]: IconSize.Sm,
    [SelectButtonSize.Lg]: IconSize.Sm,
  };
export const STARTICON_ICONSIZE_BY_SELECTBUTTONSIZE: StartIconIconSizeBySelectButtonSize =
  {
    [SelectButtonSize.Sm]: AvatarSize.Xs,
    [SelectButtonSize.Md]: AvatarSize.Sm,
    [SelectButtonSize.Lg]: AvatarSize.Sm,
  };

// Sample consts
export const SAMPLE_SELECTBUTTON_PROPS: SelectButtonProps = {
  iconProps: SAMPLE_AVATAR_PROPS,
  size: DEFAULT_SELECTBUTTON_SIZE,
  label: 'Sample SelectButton label',
  description: 'Sample SelectButton description',
  isDisabled: false,
  isDanger: false,
};
