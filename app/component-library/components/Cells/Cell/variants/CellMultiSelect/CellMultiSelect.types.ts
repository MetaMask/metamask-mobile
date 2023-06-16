// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { CellVariants } from '../../Cell.types';
import { MultiSelectItemProps } from '../../../../Select/MultiSelect/MultiSelectItem/MultiSelectItem.types';

/**
 * Cell Account MultiSelect  component props.
 */
export interface CellMultiSelectProps
  extends CellBaseProps,
    Omit<MultiSelectItemProps, 'children'> {
  /**
   * Type of Cell
   */
  variant: CellVariants.MultiSelect;
}

/**
 * Style sheet input parameters.
 */
export type CellMultiSelectStyleSheetVars = Pick<CellMultiSelectProps, 'style'>;
