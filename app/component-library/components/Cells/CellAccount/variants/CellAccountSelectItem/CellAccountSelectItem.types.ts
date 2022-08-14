// External dependencies.
import {
  CellAccountBaseItemProps,
  CellAccountItemType,
} from '../../src/CellAccountBaseItem/CellAccountBaseItem.types';
import { SelectItemProps } from '../../../../Select/Select/SelectItem/SelectItem.types';

/**
 * Cell Account Select Item component props.
 */
export interface CellAccountSelectItemProps
  extends CellAccountBaseItemProps,
    Omit<SelectItemProps, 'children'> {
  /**
   * Type of CellAccountItem
   */
  type: CellAccountItemType.Select;
}

/**
 * Style sheet input parameters.
 */
export type CellAccountSelectItemStyleSheetVars = Pick<
  CellAccountSelectItemProps,
  'style'
>;
