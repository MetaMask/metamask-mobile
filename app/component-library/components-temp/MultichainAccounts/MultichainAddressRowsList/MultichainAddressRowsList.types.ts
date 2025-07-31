import { StyleProp, ViewStyle } from 'react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipChainId } from '@metamask/utils';

export interface NetworkAddressItem {
  chainId: CaipChainId;
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
