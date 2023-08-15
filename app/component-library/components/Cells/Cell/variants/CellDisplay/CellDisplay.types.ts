// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { CellVariants } from '../../Cell.types';

/**
 * Cell Account Select  component props.
 */
export interface CellDisplayProps extends CellBaseProps {
  /**
   * Type of Cell
   */
  variant: CellVariants.Display;
}

/**
 * Style sheet input parameters.
 */
export type CellDisplayStyleSheetVars = Pick<CellDisplayProps, 'style'>;
