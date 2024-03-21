/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

// External dependencies.
import { IconSize, IconName } from '../../Icons/Icon';

// Internal dependencies.
import {
  ButtonIconSizes,
  IconSizeByButtonIconSize,
  ButtonIconVariants,
  ButtonIconProps,
} from './ButtonIcon.types';

// Mappings
export const ICONSIZE_BY_BUTTONICONSIZE: IconSizeByButtonIconSize = {
  [ButtonIconSizes.Sm]: IconSize.Sm,
  [ButtonIconSizes.Lg]: IconSize.Lg,
};

// Defaults
export const DEFAULT_BUTTONICON_SIZE = ButtonIconSizes.Sm;
export const DEFAULT_BUTTONICON_VARIANTS = ButtonIconVariants.Secondary;

// Samples
export const SAMPLE_BUTTONICON_PROPS: ButtonIconProps = {
  iconName: IconName.Add,
  onPress: () => {
    console.log('Button Icon pressed');
  },
  variant: DEFAULT_BUTTONICON_VARIANTS,
  size: DEFAULT_BUTTONICON_SIZE,
  isDisabled: false,
};
