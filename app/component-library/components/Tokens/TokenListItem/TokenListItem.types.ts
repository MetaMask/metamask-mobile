// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';

/**
 * TokenListItem component props.
 */
export interface TokenListItemProps extends ListItemProps {
  primaryAmount: string;
  secondaryAmount?: string;
  tokenSymbol: string;
  tokenName: string;
  tokenImageSource: ImageSourcePropType;
  isStake?: boolean;
}
