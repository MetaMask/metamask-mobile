// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { CellVariants } from '../../Cell.types';
import { SelectItemProps } from '../../../../Select/Select/SelectItem/SelectItem.types';

/**
 * Cell Account Select  component props.
 */
export interface CellSelectProps
  extends CellBaseProps,
    Omit<SelectItemProps, 'children'> {
  /**
   * Type of Cell
   */
  variant: CellVariants.Select;
}

/**
 * Style sheet input parameters.
 */
export type CellSelectStyleSheetVars = Pick<CellSelectProps, 'style'>;
