// External dependencies.
import { TextProps, TextVariant } from '../../../../Texts/Text/Text.types';
import { ButtonVariants } from '../../Button.types';

/**
 * ButtonLink component props.
 */
export interface ButtonLinkProps extends Omit<TextProps, 'variant'> {
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
  TextVariant?: TextVariant;
}

/**
 * Style sheet input parameters.
 */
export type ButtonLinkStyleSheetVars = Pick<ButtonLinkProps, 'style'>;
