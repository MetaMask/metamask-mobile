// External dependencies.
import { BaseListSelectProps } from '../../../base-components/List/BaseListSelect/BaseListSelect.types';
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';

/**
 * ListSelect component props.
 */
export interface ListSelectProps extends Omit<BaseListSelectProps, 'options'> {
  /**
   * Optional props for the list of options
   */
  options?: ListItemProps[];
}
