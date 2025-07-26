import { StyleProp, ViewStyle } from 'react-native';
import { ProviderConfig } from '../../../../selectors/networkController';

export interface MultichainAddressRowProps {
  /**
   * Network provider configuration containing nickname, chainId, and other network details
   */
  network: ProviderConfig;
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
