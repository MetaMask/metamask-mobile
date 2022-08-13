// External dependencies.
import {
  CellAccountBaseItemProps,
  CellAccountBaseItemType,
} from '../CellAccountBaseItem/CellAccountBaseItem.types';
import { SelectItemProps } from '../../Select/Select/SelectItem/SelectItem.types';

/**
 * Cell Account Select Item component props.
 */
export interface CellAccountSelectItemProps
  extends CellAccountBaseItemProps,
    Omit<SelectItemProps, 'children'> {
  /**
   * Type of CellAccountItem
   */
  type: CellAccountBaseItemType.Select;
}

/**
 * Style sheet input parameters.
 */
export type CellAccountSelectItemStyleSheetVars = Pick<
  CellAccountSelectItemProps,
  'style'
>;
