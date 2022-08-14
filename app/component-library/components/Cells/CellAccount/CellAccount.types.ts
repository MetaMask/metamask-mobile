// External dependencies.
import { CellAccountDisplayItemProps } from '../CellAccountDisplayItem/CellAccountDisplayItem.types';
import { CellAccountMultiselectItemProps } from '../CellAccountMultiselectItem/CellAccountMultiselectItem.types';
import { CellAccountSelectItemProps } from '../CellAccountSelectItem/CellAccountSelectItem.types';

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
