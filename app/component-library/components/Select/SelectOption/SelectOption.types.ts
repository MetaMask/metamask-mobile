// External dependencies.
import { ListItemSelectProps } from '../../List/ListItemSelect/ListItemSelect.types';
import { SelectValueProps } from '../SelectValue/SelectValue.types';

/**
 * SelectOption component props.
 */
export interface SelectOptionProps
  extends Omit<ListItemSelectProps, 'hitSlop'>,
    Omit<SelectValueProps, 'style' | 'hitSlop'> {
  /**
   * Optional prop to define the hitSlop area.
   */
  hitSlop?: ListItemSelectProps['hitSlop'];
}

/**
 * Style sheet input parameters.
 */
export type SelectOptionStyleSheetVars = Pick<SelectOptionProps, 'style'>;
