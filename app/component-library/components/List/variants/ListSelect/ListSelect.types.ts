// External dependencies.
import { TextFieldSearchProps } from '../../../Form/TextFieldSearch/TextFieldSearch.types';
import { ListItemSelectProps } from '../../ListItemSelect/ListItemSelect.types';

// Internal dependencies.
import { ListBaseProps } from '../../foundation/ListBase.types';

export type ListSelectOption = Omit<ListItemSelectProps, 'isSelected'>;

interface ListSelectSearchableProps extends Omit<ListBaseProps, 'children'> {
  /**
   * Optional prop for the TextFieldSearch
   */
  isSearchable: true;
  /**
   * Enum to replace the filtered list.
   */
  getFilteredListOptions: (searchText: string) => ListSelectOption[];
  /**
   * Optional prop for the TextFieldSearch
   */
  textFieldSearchProps?: TextFieldSearchProps;
}

interface ListSelectNonSearchableProps extends Omit<ListBaseProps, 'children'> {
  /**
   * Optional prop for the TextFieldSearch
   */
  isSearchable: false;
  getFilteredListOptions?: never;
  textFieldSearchProps?: never;
}

/**
 * ListSelect component props.
 */
export type ListSelectProps = (
  | ListSelectSearchableProps
  | ListSelectNonSearchableProps
) & {
  options: ListSelectOption[];
  selectedOption?: ListSelectOption;
};
