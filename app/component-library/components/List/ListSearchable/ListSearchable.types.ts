// External dependencies.
import { TextFieldSearchProps } from '../../Form/TextFieldSearch/TextFieldSearch.types';

// Internal dependencies.
import { ListSearchableBaseProps } from './foundation/ListSearchableBase.types';

/**
 * ListSearchable component props.
 */
export interface ListSearchableProps extends ListSearchableBaseProps {
  /**
   * Optional prop for the TextFieldSearch
   */
  textFieldSearchProps?: TextFieldSearchProps;
  /**
   * Enum to replace the filtered list.
   */
  renderFilteredList: (searchText: string) => JSX.Element;
}
