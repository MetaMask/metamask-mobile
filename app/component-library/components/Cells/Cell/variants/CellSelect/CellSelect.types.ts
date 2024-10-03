// External dependencies.
import { CellBaseProps } from '@component-library/components/Cells/Cell/foundation/CellBase/CellBase.types';
import { ListItemSelectProps } from '@component-library/components/List/ListItemSelect/ListItemSelect.types';

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
