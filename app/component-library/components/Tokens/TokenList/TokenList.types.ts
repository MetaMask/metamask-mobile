// External dependencies.
import { TokenListItemProps } from '../TokenListItem/TokenListItem.types';
import { ValueListProps } from '../../ValueList/ValueList.types';

/**
 * TokenList component props.
 */
export interface TokenListProps extends ValueListProps {
  options: TokenListItemProps[];
}
