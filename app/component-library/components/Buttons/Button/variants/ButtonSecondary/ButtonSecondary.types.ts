// External dependencies.
import { ButtonBaseProps } from '../../foundation/ButtonBase';
import { ButtonVariants } from '../../Button.types';

/**
 * Enum used to select between variants.
 */
export enum ButtonSecondaryVariants {
  Normal = 'Normal',
  Danger = 'Danger',
}

/**
 * ButtonSecondary component props.
 */
export interface ButtonSecondaryProps
  extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Optional enum use to select between variants.
   * @default Normal
   */
  buttonSecondaryVariants?: ButtonSecondaryVariants;
  /**
   * Variant of Button.
   */
  variant?: ButtonVariants.Secondary;
}

/**
 * Style sheet input parameters.
 */
export interface ButtonSecondaryStyleSheetVars
  extends Pick<ButtonSecondaryProps, 'style'> {
  buttonSecondaryVariants: ButtonSecondaryVariants;
  pressed: boolean;
}
