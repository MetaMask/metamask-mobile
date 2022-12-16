// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * Card component props.
 */
export interface CardProps extends ViewProps {
  /**
   * Content to wrap to display.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type CardStyleSheetVars = Pick<CardProps, 'style'>;
