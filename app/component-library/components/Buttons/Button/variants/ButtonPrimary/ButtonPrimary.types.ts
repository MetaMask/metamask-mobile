// Internal dependencies.
import { ButtonBaseProps } from '../../foundation/ButtonBase';
import { ButtonVariants } from '../../Button.types';

/**
 * ButtonPrimary variant
 */
export enum ButtonPrimaryVariants {
  Normal = 'Normal',
  Danger = 'Danger',
}

/**
 * ButtonPrimary component props.
 */
export interface ButtonPrimaryProps
  extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Optional enum use to select between variants.
   * @default Normal
   */
  ButtonPrimaryVariants?: ButtonPrimaryVariants;
  /**
   * Variant of Button.
   */
  variant?: ButtonVariants.Primary;
}

/**
 * Style sheet input parameters.
 */
export interface ButtonPrimaryStyleSheetVars
  extends Pick<ButtonPrimaryProps, 'style'> {
  ButtonPrimaryVariants: ButtonPrimaryVariants;
  pressed: boolean;
}
