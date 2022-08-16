// External dependencies.
import { CellDisplayContainerProps } from '../../foundation/CellDisplayContainer/CellDisplayContainer.types';
import {
  CellBaseProps,
  CellType,
} from '../../foundation/CellBase/CellBase.types';

/**
 * Cell Account Select  component props.
 */
export interface CellDisplayProps
  extends CellBaseProps,
    Omit<CellDisplayContainerProps, 'children'> {
  /**
   * Type of Cell
   */
  type: CellType.Display;
}

/**
 * Style sheet input parameters.
 */
export type CellDisplayStyleSheetVars = Pick<CellDisplayProps, 'style'>;
