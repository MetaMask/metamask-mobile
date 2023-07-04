// External dependencies.
import { TextVariant } from '../../../../Texts/Text/Text.types';
import { ButtonBaseProps } from '../../foundation/ButtonBase';

/**
 * ButtonLink component props.
 */
export interface ButtonLinkProps extends Omit<ButtonBaseProps, 'labelColor'> {
  /**
   * Optional props to configure text component variants.
   */
  textVariant?: TextVariant;
}

/**
 * Style sheet input parameters.
 */
export type ButtonLinkStyleSheetVars = Pick<ButtonLinkProps, 'style'> & {
  isDanger: boolean;
  pressed: boolean;
};
