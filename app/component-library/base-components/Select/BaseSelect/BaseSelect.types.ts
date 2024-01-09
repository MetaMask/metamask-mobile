// External dependencies.
import { BaseSelectWrapperProps } from '../BaseSelectWrapper/BaseSelectWrapper.types';
import { BaseSelectableMenuProps } from '../../Selectable/BaseSelectableMenu/BaseSelectableMenu.types';

/**
 * BaseSelect component props.
 */
export interface BaseSelectProps
  extends Omit<BaseSelectWrapperProps, 'children'>,
    BaseSelectableMenuProps {}
