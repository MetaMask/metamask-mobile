import { ViewProps, ViewStyle } from 'react-native';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';

/**
 * The name types supported by the NameController.
 *
 * todo: replace this with the actual NameType enum from the NameController.
 */
export enum NameType {
  /** The value of an Ethereum account. */
  EthereumAddress = 'EthereumAddress',
}

export interface NameProperties extends ViewProps {
  iconSizeOverride?: AvatarSize;
  preferContractSymbol?: boolean;
  type: NameType;
  value: string;
  variation: string;
  style?: ViewStyle;
}
