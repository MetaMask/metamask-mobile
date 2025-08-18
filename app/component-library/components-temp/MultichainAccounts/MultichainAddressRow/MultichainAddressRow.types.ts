import { StyleProp, ViewStyle } from 'react-native';
import { CaipChainId } from '@metamask/utils';

import { IconName } from '../../../components/Icons/Icon';

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
   * Object containing icons to display in the row.
   * Each icon should have a name, a callback function, and test ID.
   * The callback will be executed when the icon is pressed.
   * Icons are displayed in the order they are provided.
   */
  icons: {
    name: IconName;
    callback: () => void;
    testId: string;
  }[];
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
