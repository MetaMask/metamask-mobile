/* eslint-disable import/prefer-default-export */
// External dependencies.
import { TextVariant, TextColor } from '../../Texts/Text';
import { IconName, IconColor, IconSize } from '../../Icons/Icon';
import { VerticalAlignment } from '../../List/ListItem';

// Internal dependencies.
import {
  SelectButtonSize,
  SelectButtonProps,
  IconSizeBySelectButtonSize,
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

// Mappings
export const ICONSIZE_BY_SELECTBUTTONSIZE: IconSizeBySelectButtonSize = {
  [SelectButtonSize.Sm]: IconSize.Xs,
  [SelectButtonSize.Md]: IconSize.Xs,
  [SelectButtonSize.Lg]: IconSize.Sm,
};

// Sample consts
export const SAMPLE_SELECTBUTTON_PROPS: SelectButtonProps = {
  size: DEFAULT_SELECTBUTTON_SIZE,
  title: 'Sample SelectButton title',
  description: 'Sample SelectButton description',
  isDisabled: false,
  isDanger: false,
};
