// External dependencies.
import {
  CellAccountBaseItemProps,
  CellAccountBaseItemType,
} from '../CellAccountBaseItem/CellAccountBaseItem.types';
import { MultiselectItemProps } from '../../Select/Multiselect/MultiselectItem/MultiselectItem.types';

/**
 * Cell Account Multiselect Item component props.
 */
export interface CellAccountMultiselectItemProps
  extends CellAccountBaseItemProps,
    Omit<MultiselectItemProps, 'children'> {
  /**
   * Type of CellAccountItem
   */
  type: CellAccountBaseItemType.Multiselect;
}

/**
 * Style sheet input parameters.
 */
export type CellAccountMultiselectItemStyleSheetVars = Pick<
  CellAccountMultiselectItemProps,
  'style'
>;
