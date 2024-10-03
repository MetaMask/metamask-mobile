// External dependencies.
import { ListItemSelectProps } from '@component-library/components/List/ListItemSelect/ListItemSelect.types';
import { SelectValueProps } from '@component-library/components/Select/SelectValue/SelectValue.types';

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
