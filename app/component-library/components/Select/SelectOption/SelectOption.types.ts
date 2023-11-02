// External dependencies.
import { SelectItemProps } from '../Select/SelectItem/SelectItem.types';
import { SelectValueProps } from '../SelectValue/SelectValue.types';

/**
 * SelectOption component props.
 */
export interface SelectOptionProps
  extends SelectItemProps,
    Omit<SelectValueProps, 'style'> {}

/**
 * Style sheet input parameters.
 */
export type SelectOptionStyleSheetVars = Pick<SelectOptionProps, 'style'>;
