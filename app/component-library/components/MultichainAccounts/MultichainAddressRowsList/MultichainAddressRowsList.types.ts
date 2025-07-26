import { StyleProp, ViewStyle } from 'react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';

export interface NetworkAddressItem {
  chainId: string;
  networkName: string;
  address: string;
}

export interface MultichainAddressRowsListProps {
  accounts?: InternalAccount[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface MultichainAddressRowsListStyleSheetVars {
  style: StyleProp<ViewStyle>;
}
