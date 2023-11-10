// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { ListItemMultiSelectProps } from '../../../../List/ListItemMultiSelect/ListItemMultiSelect.types';

/**
 * Cell Account MultiSelect  component props.
 */
export interface CellMultiSelectProps
  extends CellBaseProps,
    Omit<ListItemMultiSelectProps, 'children'> {}

/**
 * Style sheet input parameters.
 */
export type CellMultiSelectStyleSheetVars = Pick<CellMultiSelectProps, 'style'>;
