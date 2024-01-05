// External dependencies.
import { ListProps } from '../List/List.types';
import { ValueListItemProps } from './ValueListItem/ValueListItem.types';

/**
 * ValueList variants.
 */
export enum ValueListVariant {
  Select = 'Select',
  MultiSelect = 'MultiSelect',
  Display = 'Display',
}

/**
 * ValueList component props.
 */
export interface ValueListProps extends Omit<ListProps, 'renderFilteredList'> {
  /**
   * Optional prop to select the ValueList variant
   */
  variant?: ValueListVariant;
  /**
   * Optional props for the list of options
   */
  options?: ValueListItemProps[];
  /**
   * Optional prop to control how the options are filtered.
   */
  filterCallback?: (valueListItemProps: ValueListItemProps) => boolean;
  ListItemComponent?: React.FunctionComponent<any>;
}
