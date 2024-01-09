// External dependencies.
import { BaseSelectMenuProps } from '../../../../base-components/Select/BaseSelectMenu/BaseSelectMenu.types';
import { ListSelectProps } from '../../../List/ListSelect/ListSelect.types';

/**
 * SelectMenu component props.
 */
export interface SelectMenuProps
  extends Omit<BaseSelectMenuProps, 'children'>,
    ListSelectProps {}
