// External dependencies.
import { CellAccountContentProps } from '../CellAccountContent/CellAccountContent.types';
import { MultiselectItemProps } from '../../Select/Multiselect/MultiselectItem/MultiselectItem.types';

/**
 * Cell Account Select Item component props.
 */
export interface CellAccountMultiselectItemProps
  extends CellAccountContentProps,
    Omit<MultiselectItemProps, 'children'> {}

/**
 * Style sheet input parameters.
 */
export type CellAccountMultiselectItemStyleSheetVars = Pick<
  CellAccountMultiselectItemProps,
  'style'
>;
