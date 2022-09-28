// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

/**
 * CellDisplayContainer component props.
 */
export interface CellDisplayContainerProps extends TouchableOpacityProps {
  /**
   * Content to wrap to display.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type CellDisplayContainerStyleSheetVars = Pick<
  CellDisplayContainerProps,
  'style'
>;
