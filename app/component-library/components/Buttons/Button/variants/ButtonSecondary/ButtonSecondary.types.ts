// External dependencies.
import { ButtonBaseProps } from '../../foundation/ButtonBase';
import { ButtonVariants } from '../../Button.types';

/**
 * ButtonSecondary component props.
 */
export interface ButtonSecondaryProps
  extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Variant of Button.
   */
  variant?: ButtonVariants.Secondary;
}
