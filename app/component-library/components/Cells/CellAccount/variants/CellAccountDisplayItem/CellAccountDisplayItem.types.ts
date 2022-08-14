// External dependencies.
import { CellAccountDisplayItemContainerProps } from '../../src/CellAccountDisplayItemContainer/CellAccountDisplayItemContainer.types';
import {
  CellAccountBaseItemProps,
  CellAccountItemType,
} from '../../src/CellAccountBaseItem/CellAccountBaseItem.types';

/**
 * Cell Account Select Item component props.
 */
export interface CellAccountDisplayItemProps
  extends CellAccountBaseItemProps,
    Omit<CellAccountDisplayItemContainerProps, 'children'> {
  /**
   * Type of CellAccountItem
   */
  type: CellAccountItemType.Display;
}

/**
 * Style sheet input parameters.
 */
export type CellAccountDisplayItemStyleSheetVars = Pick<
  CellAccountDisplayItemProps,
  'style'
>;
