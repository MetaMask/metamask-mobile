// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { ListItemMultiSelectButtonProps } from '../../../../../components-temp/ListItemMultiSelectButton/ListItemMultiSelectButton.types';

/**
 * Cell Account Select component props.
 */
export interface CellSelectWithMenuProps
  extends CellBaseProps,
    Omit<ListItemMultiSelectButtonProps, 'children'> {}

/**
 * Style sheet input parameters.
 */
export type CellSelectWithMenuStyleSheetVars = Pick<
  CellSelectWithMenuProps,
  'style'
>;
