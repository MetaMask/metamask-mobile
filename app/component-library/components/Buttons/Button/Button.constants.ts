/* eslint-disable import/prefer-default-export */

// External dependencies.
import { SAMPLE_BUTTONSECONDARY_PROPS } from './variants/ButtonSecondary/ButtonSecondary.constants';

// Internal dependencies.
import { ButtonProps, ButtonVariants } from './Button.types';

// Samples
export const SAMPLE_BUTTON_PROPS: ButtonProps = {
  variant: ButtonVariants.Secondary,
  ...SAMPLE_BUTTONSECONDARY_PROPS,
};
