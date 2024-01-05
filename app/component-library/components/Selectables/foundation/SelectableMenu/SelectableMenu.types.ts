// External dependencies.
import { SelectableHeaderProps } from '../SelectableHeader/SelectableHeader.types';
import { ValueListProps } from '../../../ValueList/ValueList.types';

// Internal dependencies.
import { SelectableMenuBaseProps } from './foundation/SelectableMenuBase.types';

/**
 * SelectableMenu component props.
 */
export interface SelectableMenuProps
  extends SelectableMenuBaseProps,
    Omit<SelectableHeaderProps, 'children'>,
    ValueListProps {
  /**
   * Optional boolean that indicates if list should be used as multi select.
   */
  isMultiSelect?: boolean;
}

/**
 * Style sheet SelectableMenu parameters.
 */
export type SelectableMenuStyleSheetVars = Pick<SelectableMenuProps, 'style'>;
