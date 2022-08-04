import { BaseTextProps } from '../../BaseText/BaseText.types';

/**
 * ButtonLink component props.
 */
export interface ButtonLinkProps extends BaseTextProps {
  /**
   * Function to trigger when pressing the link.
   */
  onPress: () => void;
}

/**
 * Style sheet input parameters.
 */
export type ButtonLinkStyleSheetVars = Pick<ButtonLinkProps, 'style'>;
