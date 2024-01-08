// External dependencies.
import { TextFieldSearchProps } from '../../../Form/TextFieldSearch/TextFieldSearch.types';
import { ListItemMultiSelectProps } from '../../ListItemMultiSelect/ListItemMultiSelect.types';

// Internal dependencies.
import { ListBaseProps } from '../../foundation/ListBase.types';

interface ListMultiSelectSearchableProps
  extends Omit<ListBaseProps, 'children'> {
  /**
   * Optional prop for the TextFieldSearch
   */
  isSearchable: true;
  /**
   * Enum to replace the filtered list.
   */
  getFilteredListOptions: (searchText: string) => ListItemMultiSelectProps[];
  /**
   * Optional prop for the TextFieldSearch
   */
  textFieldSearchProps?: TextFieldSearchProps;
}

interface ListMultiSelectNonSearchableProps
  extends Omit<ListBaseProps, 'children'> {
  /**
   * Optional prop for the TextFieldSearch
   */
  isSearchable: false;
  getFilteredListOptions?: never;
  textFieldSearchProps?: never;
}

/**
 * ListMultiSelect component props.
 */
export type ListMultiSelectProps = (
  | ListMultiSelectSearchableProps
  | ListMultiSelectNonSearchableProps
) & {
  options: ListItemMultiSelectProps[];
};
