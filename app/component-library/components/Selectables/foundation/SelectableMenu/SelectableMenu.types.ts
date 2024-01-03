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
    ValueListProps {}

/**
 * Style sheet SelectableMenu parameters.
 */
export type SelectableMenuStyleSheetVars = Pick<SelectableMenuProps, 'style'>;
