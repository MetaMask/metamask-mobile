// External dependencies.
import { ListSearchableProps } from '../../List/ListSearchable/ListSearchable.types';
import { SelectOptionProps } from '../SelectOption/SelectOption.types';

/**
 * SelectOptionsList component props.
 */
export interface SelectOptionsListProps extends ListSearchableProps {
  /**
   * Optional enum to replace the filtered list.
   */
  options?: SelectOptionProps[];
  /**
   * Optional prop to control how the options are filtered.
   */
  filterCallback?: (selectOptionProps: SelectOptionProps) => boolean;
}
