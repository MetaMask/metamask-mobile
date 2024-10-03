// External dependencies.
import { CellBaseProps } from '@component-library/components/Cells/Cell/foundation/CellBase/CellBase.types';
import { ListItemMultiSelectProps } from '@component-library/components/List/ListItemMultiSelect/ListItemMultiSelect.types';

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
