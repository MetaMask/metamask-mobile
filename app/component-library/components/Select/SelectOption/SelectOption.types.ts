// External dependencies.
import { ListItemSelectProps } from '../../List/ListItemSelect/ListItemSelect.types';
import { SelectValueProps } from '../SelectValue/SelectValue.types';

/**
 * SelectOption component props.
 */
export interface SelectOptionProps
  extends ListItemSelectProps,
    Omit<SelectValueProps, 'style'> {}

/**
 * Style sheet input parameters.
 */
export type SelectOptionStyleSheetVars = Pick<SelectOptionProps, 'style'>;
