// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { CellVariants } from '../../Cell.types';
import { MultiSelectItemProps } from '../../../../Select/MultiSelect/MultiSelectItem/MultiSelectItem.types';

/**
 * Cell Account Multiselect  component props.
 */
export interface CellMultiselectProps
  extends CellBaseProps,
    Omit<MultiSelectItemProps, 'children'> {
  /**
   * Type of Cell
   */
  variant: CellVariants.Multiselect;
}

/**
 * Style sheet input parameters.
 */
export type CellMultiselectStyleSheetVars = Pick<CellMultiselectProps, 'style'>;
