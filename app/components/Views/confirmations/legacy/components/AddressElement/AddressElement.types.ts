import { Hex } from '@metamask/utils';
import { Props } from 'react-native';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';

export interface AddressElementProps extends TouchableOpacityProps {
  /**
   * Name to display
   */
  name?: string;
  /**
   * Ethereum address
   */
  address: string;
  /**
   * An Address that might exist on many networks
   */
  isAmbiguousAddress?: boolean;
  /**
   * Callback on account press
   */
  onAccountPress: (address: string) => void;
  /**
   * Callback on account long press
   */
  onAccountLongPress: (address: string) => void;
  /**
   * Callback for icon press
   */
  onIconPress: () => void;
  /**
   * ID of the chain
   */
  chainId: Hex;
  /**
   * Whether to display the network badge, defaults to false.
   * If true, the network badge will be displayed on the bottom right of the avatar.
   */
  displayNetworkBadge?: boolean;
}
