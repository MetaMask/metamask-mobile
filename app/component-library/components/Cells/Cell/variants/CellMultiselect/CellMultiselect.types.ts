// External dependencies.
import {
  CellBaseProps,
  CellType,
} from '../../foundation/CellBase/CellBase.types';
import { MultiselectItemProps } from '../../../../Select/Multiselect/MultiselectItem/MultiselectItem.types';

/**
 * Cell Account Multiselect  component props.
 */
export interface CellMultiselectProps
  extends CellBaseProps,
    Omit<MultiselectItemProps, 'children'> {
  /**
   * Type of Cell
   */
  type: CellType.Multiselect;
}

/**
 * Style sheet input parameters.
 */
export type CellMultiselectStyleSheetVars = Pick<CellMultiselectProps, 'style'>;
