// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { ValueListItemProps } from '../../ValueList/ValueListItem/ValueListItem.types';

/**
 * TokenListItem component props.
 */
export interface TokenListItemProps extends ValueListItemProps {
  primaryAmount: string;
  secondaryAmount?: string;
  tokenSymbol: string;
  tokenName: string;
  tokenImageSource: ImageSourcePropType;
  isStake?: boolean;
}
