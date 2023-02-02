// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

/**
 * Card component props.
 */
export interface CardProps extends TouchableOpacityProps {
  /**
   * Content to wrap to display.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type CardStyleSheetVars = Pick<CardProps, 'style'>;
