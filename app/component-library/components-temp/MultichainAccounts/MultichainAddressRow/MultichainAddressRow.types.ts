import { StyleProp, ViewStyle } from 'react-native';
import { CaipChainId } from '@metamask/utils';

export interface MultichainAddressRowProps {
  /**
   * Chain ID to identify the network
   */
  chainId: CaipChainId;
  /**
   * Network name to display
   */
  networkName: string;
  /**
   * Address string to display (will be truncated)
   */
  address: string;
  /**
   * Optional style object for the container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional test ID for testing purposes
   */
  testID?: string;
}

export interface MultichainAddressRowStyleSheetVars {
  style: StyleProp<ViewStyle>;
}
