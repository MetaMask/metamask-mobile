// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { BaseListItemSelectProps } from '../../../../../base-components/ListItem/BaseListItemSelect/BaseListItemSelect.types';

/**
 * Cell Account Select  component props.
 */
export interface CellSelectProps
  extends CellBaseProps,
    Omit<BaseListItemSelectProps, 'children'> {}

/**
 * Style sheet input parameters.
 */
export type CellSelectStyleSheetVars = Pick<CellSelectProps, 'style'>;
