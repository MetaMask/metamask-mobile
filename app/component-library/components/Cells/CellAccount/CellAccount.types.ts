// External dependencies.
import { CellAccountDisplayItemProps } from './variants/CellAccountDisplayItem/CellAccountDisplayItem.types';
import { CellAccountMultiselectItemProps } from './variants/CellAccountMultiselectItem/CellAccountMultiselectItem.types';
import { CellAccountSelectItemProps } from './variants/CellAccountSelectItem/CellAccountSelectItem.types';

/**
 * Cell Account component props.
 */
export type CellAccountProps =
  | CellAccountDisplayItemProps
  | CellAccountMultiselectItemProps
  | CellAccountSelectItemProps;

/**
 * Style sheet input parameters.
 */
export type CellAccountStyleSheetVars = Pick<CellAccountProps, 'style'>;
