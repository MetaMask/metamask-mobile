// Internal dependencies.
import { ListSearchableProps } from './foundation/ListSearchable/ListSearchable.types';
import { ListBaseProps } from './foundation/ListBase.types';

/**
 * ListSearchable component props.
 */
export interface ListProps
  extends Partial<ListSearchableProps>,
    ListBaseProps {}
