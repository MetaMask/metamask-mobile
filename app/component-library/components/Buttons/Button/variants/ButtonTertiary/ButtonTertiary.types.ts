// External dependencies.
import { ButtonBaseProps } from '../../foundation/ButtonBase';
import { ButtonVariants } from '../../Button.types';

/**
 * Enum used to select between variants.
 */
export enum ButtonTertiaryVariants {
  Normal = 'Normal',
  Danger = 'Danger',
}

/**
 * ButtonTertiary component props.
 */
export interface ButtonTertiaryProps
  extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Optional enum use to select between variants.
   * @default Normal
   */
  buttonTertiaryVariants?: ButtonTertiaryVariants;
  /**
   * Variant of Button.
   */
  variant?: ButtonVariants.Tertiary;
}

/**
 * Style sheet input parameters.
 */
export type ButtonTertiaryStyleSheetVars = Pick<ButtonTertiaryProps, 'style'>;
