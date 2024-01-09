// External dependencies.
import { BaseListProps } from '../../../base-components/List/BaseList/BaseList.types';
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';

/**
 * List component props.
 */
export interface ListProps extends Omit<BaseListProps, 'options'> {
  /**
   * Optional props for the list of options
   */
  options?: ListItemProps[];
}
