// External dependencies.
import { CellBaseProps } from '../../../component-library/components/Cells/Cell/foundation/CellBase/CellBase.types';
import { ListItemMultiSelectButtonProps } from '../ListItemMultiSelectButton/ListItemMultiSelectButton.types';

/**
 * Cell Account Select  component props.
 */
export type CellSelectWithMenuProps = CellBaseProps &
  Omit<ListItemMultiSelectButtonProps, 'children'>;

/**
 * Style sheet input parameters.
 */
export type CellSelectWithMenuStyleSheetVars = Pick<
  CellSelectWithMenuProps,
  'style'
>;
