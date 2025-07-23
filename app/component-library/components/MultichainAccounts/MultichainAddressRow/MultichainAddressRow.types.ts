import { StyleProp, ViewStyle } from 'react-native';

export interface MultichainAddressRowProps {
  /**
   * Chain ID to identify the network
   */
  chainId: string;
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
