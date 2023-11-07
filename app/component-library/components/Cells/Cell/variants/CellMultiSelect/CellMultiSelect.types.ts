// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { MultiSelectItemProps } from '../../../../Select/MultiSelect/MultiSelectItem/MultiSelectItem.types';

/**
 * Cell Account MultiSelect  component props.
 */
export interface CellMultiSelectProps
  extends CellBaseProps,
    Omit<MultiSelectItemProps, 'children'> {}

/**
 * Style sheet input parameters.
 */
export type CellMultiSelectStyleSheetVars = Pick<CellMultiSelectProps, 'style'>;
