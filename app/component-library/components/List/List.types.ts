// Internal dependencies.
import { ListSearchableProps } from './variants/ListSearchable/ListSearchable.types';
import { ListBaseProps } from './foundation/ListBase.types';

/**
 * ListSearchable component props.
 */
export interface ListProps extends Partial<ListSearchableProps>, ListBaseProps {
  /**
   * Boolean for the whether the list is searchable
   */
  isSearchable?: boolean;
}
