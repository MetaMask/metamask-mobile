// External dependencies.
import { TextProps } from '../../Text/Text.types';

/**
 * ButtonLink component props.
 */
export interface ButtonLinkProps extends TextProps {
  /**
   * Function to trigger when pressing the link.
   */
  onPress: () => void;
}

/**
 * Style sheet input parameters.
 */
export type ButtonLinkStyleSheetVars = Pick<ButtonLinkProps, 'style'>;
