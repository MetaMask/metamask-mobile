// External dependencies.
import { CellAccountDisplayItemContainerProps } from '../CellAccountDisplayItemContainer/CellAccountDisplayItemContainer.types';
import {
  CellAccountBaseItemProps,
  CellAccountBaseItemType,
} from '../CellAccountBaseItem/CellAccountBaseItem.types';

/**
 * Cell Account Select Item component props.
 */
export interface CellAccountDisplayItemProps
  extends CellAccountBaseItemProps,
    Omit<CellAccountDisplayItemContainerProps, 'children'> {
  /**
   * Type of CellAccountItem
   */
  type: CellAccountBaseItemType.Display;
}

/**
 * Style sheet input parameters.
 */
export type CellAccountDisplayItemStyleSheetVars = Pick<
  CellAccountDisplayItemProps,
  'style'
>;
