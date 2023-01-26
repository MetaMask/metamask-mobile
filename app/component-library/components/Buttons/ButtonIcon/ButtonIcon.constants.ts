/* eslint-disable import/prefer-default-export */

// External dependencies.
import { IconSize } from '../../Icon';

// Internal dependencies.
import { ButtonIconSizes, IconSizeByButtonIconSize } from './ButtonIcon.types';

export const ICON_SIZE_BY_BUTTON_ICON_SIZE: IconSizeByButtonIconSize = {
  [ButtonIconSizes.Sm]: IconSize.Sm,
  [ButtonIconSizes.Lg]: IconSize.Lg,
};
