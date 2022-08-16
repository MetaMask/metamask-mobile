// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * CellDisplayContainer component props.
 */
export interface CellDisplayContainerProps extends ViewProps {
  /**
   * Content to wrap for selection.
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
