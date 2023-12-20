// External dependencies.
import { SelectHeaderProps } from '../SelectHeader/SelectHeader.types';
import { SelectOptionsListProps } from '../SelectOptionsList/SelectOptionsList.types';

// Internal dependencies.
import { SelectMenuBaseProps } from './foundation/SelectMenuBase.types';

/**
 * SelectMenu component props.
 */
export interface SelectMenuProps
  extends SelectMenuBaseProps,
    Omit<SelectHeaderProps, 'children'>,
    SelectOptionsListProps {}

/**
 * Style sheet SelectMenu parameters.
 */
export type SelectMenuStyleSheetVars = Pick<SelectMenuProps, 'style'>;
