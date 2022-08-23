// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { CellDisplayContainerProps } from '../../foundation/CellDisplayContainer/CellDisplayContainer.types';
import { CellVariants } from '../../Cell.types';

/**
 * Cell Account Select  component props.
 */
export interface CellDisplayProps
  extends CellBaseProps,
    Omit<CellDisplayContainerProps, 'children'> {
  /**
   * Type of Cell
   */
  variant: CellVariants.Display;
}

/**
 * Style sheet input parameters.
 */
export type CellDisplayStyleSheetVars = Pick<CellDisplayProps, 'style'>;
