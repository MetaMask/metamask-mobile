// Internal dependencies.
import { ButtonBaseProps } from '../../foundation/ButtonBase';
import { ButtonVariants } from '../../Button.types';

/**
 * ButtonPrimary component props.
 */
export interface ButtonPrimaryProps
  extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Variant of Button.
   */
  variant?: ButtonVariants.Primary;
}
