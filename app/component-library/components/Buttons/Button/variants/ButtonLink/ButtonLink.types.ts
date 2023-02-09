// External dependencies.
import { TextVariant } from '../../../../Texts/Text/Text.types';
import { ButtonVariants } from '../../Button.types';
import { ButtonBaseProps } from '../../foundation/ButtonBase';

/**
 * ButtonLink component props.
 */
export interface ButtonLinkProps extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Function to trigger when pressing the link.
   */
  onPress: () => void;
  /**
   * Variant of Button.
   */
  variant?: ButtonVariants.Link;
  /**
   * Text component variants.
   */
  textVariant?: TextVariant;
}
