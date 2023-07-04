/* eslint-disable import/prefer-default-export */

// External dependencies.
import { SAMPLE_BUTTONSECONDARY_PROPS } from './variants/ButtonSecondary/ButtonSecondary.constants';

// Internal dependencies.
import {
  ButtonSize,
  ButtonWidthTypes,
  ButtonProps,
  ButtonVariants,
} from './Button.types';

// Defaults
export const DEFAULT_BUTTON_SIZE = ButtonSize.Md;
export const DEFAULT_BUTTON_WIDTH = ButtonWidthTypes.Auto;

// Samples
export const SAMPLE_BUTTON_PROPS: ButtonProps = {
  variant: ButtonVariants.Secondary,
  ...SAMPLE_BUTTONSECONDARY_PROPS,
};
