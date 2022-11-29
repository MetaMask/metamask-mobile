// External dependencies.
import { ButtonBaseProps } from '../../foundation/ButtonBase';
import { ButtonVariants } from '../../Button.types';

/**
 * ButtonTertiary component props.
 */
export interface ButtonTertiaryProps
  extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Variant of Button.
   */
  variant?: ButtonVariants.Tertiary;
}

/**
 * Style sheet input parameters.
 */
export type ButtonTertiaryStyleSheetVars = Pick<ButtonTertiaryProps, 'style'>;
