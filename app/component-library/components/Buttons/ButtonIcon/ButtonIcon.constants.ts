/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

// External dependencies.
import { IconSize, IconName, IconColor } from '../../Icons/Icon';

// Internal dependencies.
import {
  ButtonIconSizes,
  IconSizeByButtonIconSize,
  ButtonIconProps,
} from './ButtonIcon.types';

// Mappings
export const ICONSIZE_BY_BUTTONICONSIZE: IconSizeByButtonIconSize = {
  [ButtonIconSizes.Sm]: IconSize.Sm,
  [ButtonIconSizes.Md]: IconSize.Md,
  [ButtonIconSizes.Lg]: IconSize.Lg,
};

// Defaults
export const DEFAULT_BUTTONICON_SIZE = ButtonIconSizes.Sm;
export const DEFAULT_BUTTONICON_ICONNAME = IconName.Add;
export const DEFAULT_BUTTONICON_ICONCOLOR = IconColor.Default;

// Samples
export const SAMPLE_BUTTONICON_PROPS: ButtonIconProps = {
  iconName: DEFAULT_BUTTONICON_ICONNAME,
  onPress: () => {
    console.log('Button Icon pressed');
  },
  iconColor: DEFAULT_BUTTONICON_ICONCOLOR,
  size: DEFAULT_BUTTONICON_SIZE,
  isDisabled: false,
};
