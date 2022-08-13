// External dependencies.
import { CellAccountContentProps } from '../CellAccountContent/CellAccountContent.types';
import { SelectItemProps } from '../../Select/Select/SelectItem/SelectItem.types';

/**
 * Cell Account Select Item component props.
 */
export interface CellAccountSelectItemProps
  extends CellAccountContentProps,
    Omit<SelectItemProps, 'children'> {}

/**
 * Style sheet input parameters.
 */
export type CellAccountSelectItemStyleSheetVars = Pick<
  CellAccountSelectItemProps,
  'style'
>;
