// External dependencies.
import { SelectProps } from '../../Selectables/Select/Select.types';
import { TokenListItemProps } from '../TokenListItem/TokenListItem.types';

/**
 * TokenSelect component props.
 */
export interface TokenSelectProps extends SelectProps {
  value?: TokenListItemProps;
  options: TokenListItemProps[];
}
