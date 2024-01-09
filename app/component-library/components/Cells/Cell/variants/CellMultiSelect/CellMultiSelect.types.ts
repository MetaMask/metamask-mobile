// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { BaseListItemMultiSelectProps } from '../../../../../base-components/ListItem/BaseListItemMultiSelect/BaseListItemMultiSelect.types';

/**
 * Cell Account MultiSelect  component props.
 */
export interface CellMultiSelectProps
  extends CellBaseProps,
    Omit<BaseListItemMultiSelectProps, 'children'> {}

/**
 * Style sheet input parameters.
 */
export type CellMultiSelectStyleSheetVars = Pick<CellMultiSelectProps, 'style'>;
