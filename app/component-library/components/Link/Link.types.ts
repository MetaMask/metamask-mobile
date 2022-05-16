import { StyleProp, TextProps, TextStyle } from 'react-native';
import { BaseTextProps } from '../BaseText/BaseText.types';

/**
 * Link component props.
 */
export interface LinkProps extends TextProps {
  /**
   * Enum to select between Typography variants.
   */
  variant?: BaseTextProps['variant'];
  /**
  /**
   * Function to trigger when pressing the link.
   */
  onPress: () => void;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<TextStyle>;
  /**
   * Children component of a Text component.
   */
  children?: React.ReactNode;
}

/**
 * Link component style sheet.
 */
export interface LinkStyleSheet {
  base: TextStyle;
}

/**
 * Style sheet input parameters.
 */
export type LinkStyleSheetVars = Pick<LinkProps, 'style'>;
