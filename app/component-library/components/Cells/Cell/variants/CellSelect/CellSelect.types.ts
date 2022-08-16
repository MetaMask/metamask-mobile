// External dependencies.
import {
  CellBaseProps,
  CellType,
} from '../../foundation/CellBase/CellBase.types';
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
  type: CellType.Select;
}

/**
 * Style sheet input parameters.
 */
export type CellSelectStyleSheetVars = Pick<CellSelectProps, 'style'>;
