// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { ListItemSelectProps } from '../../../../List/ListItemSelect/ListItemSelect.types';

/**
 * Cell Account Select  component props.
 */
export interface CellSelectProps
  extends CellBaseProps,
    Omit<ListItemSelectProps, 'children'> {}

/**
 * Style sheet input parameters.
 */
export type CellSelectStyleSheetVars = Pick<CellSelectProps, 'style'>;
