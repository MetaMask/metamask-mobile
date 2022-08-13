// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * CellAccountDisplayItemContainer component props.
 */
export interface CellAccountDisplayItemContainerProps extends ViewProps {
  /**
   * Content to wrap for selection.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type CellAccountDisplayItemContainerStyleSheetVars = Pick<
  CellAccountDisplayItemContainerProps,
  'style'
>;
