// External dependencies.
import { BaseListMultiSelectProps } from '../../../base-components/List/BaseListMultiSelect/BaseListMultiSelect.types';
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';

/**
 * ListMultiSelect component props.
 */
export interface ListMultiSelectProps
  extends Omit<BaseListMultiSelectProps, 'options'> {
  /**
   * Optional props for the list of options
   */
  options?: ListItemProps[];
}
