/* eslint-disable import/prefer-default-export */

// External dependencies.
import { IconSize } from '../../Icons/Icon';

// Internal dependencies.
import {
  ButtonIconSizes,
  IconSizeByButtonIconSize,
  ButtonIconVariants,
} from './ButtonIcon.types';

// Mappings
export const ICON_SIZE_BY_BUTTON_ICON_SIZE: IconSizeByButtonIconSize = {
  [ButtonIconSizes.Sm]: IconSize.Sm,
  [ButtonIconSizes.Lg]: IconSize.Lg,
};

// Defaults
export const DEFAULT_BUTTON_ICON_SIZE = ButtonIconSizes.Sm;
export const DEFAULT_BUTTON_ICON_VARIANTS = ButtonIconVariants.Secondary;
