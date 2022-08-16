// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { CellVariants } from '../../Cell.types';
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
  variant: CellVariants.Multiselect;
}

/**
 * Style sheet input parameters.
 */
export type CellMultiselectStyleSheetVars = Pick<CellMultiselectProps, 'style'>;
