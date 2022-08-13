// External dependencies.
import { CellAccountContentProps } from '../CellAccountContent/CellAccountContent.types';
import { CellAccountDisplayItemContainerProps } from '../CellAccountDisplayItemContainer/CellAccountDisplayItemContainer.types';

/**
 * Cell Account Display Item component props.
 */
export interface CellAccountDisplayItemProps
  extends CellAccountContentProps,
    Omit<CellAccountDisplayItemContainerProps, 'children'> {}

/**
 * Style sheet input parameters.
 */
export type CellAccountDisplayItemStyleSheetVars = Pick<
  CellAccountDisplayItemProps,
  'style'
>;
