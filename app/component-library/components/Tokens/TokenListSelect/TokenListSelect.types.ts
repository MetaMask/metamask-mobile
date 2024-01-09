// External dependencies.
import { ListSelectProps } from '../../List/ListSelect/ListSelect.types';
import { TokenListItemProps } from '../TokenListItem/TokenListItem.types';

/**
 * TokenListSelect component props.
 */
export interface TokenListSelectProps extends Omit<ListSelectProps, 'options'> {
  /**
   * Optional props for the list of options
   */
  options?: TokenListItemProps[];
}
