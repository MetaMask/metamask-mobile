// External dependencies.
import { TextFieldSearchProps } from '../../../Form/TextFieldSearch/TextFieldSearch.types';

// Internal dependencies.
import { ListBaseProps } from '../ListBase.types';

/**
 * ListSearchable component props.
 */
export interface ListSearchableProps
  extends Omit<ListBaseProps, 'children' | 'topAccesory'> {
  /**
   * Optional prop for the TextFieldSearch
   */
  textFieldSearchProps?: TextFieldSearchProps;
  /**
   * Enum to replace the filtered list.
   */
  renderFilteredListCallback: (
    searchText: string,
    options: any[],
  ) => JSX.Element;
}
