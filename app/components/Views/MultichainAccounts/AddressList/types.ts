import { type CaipChainId } from '@metamask/utils';
import { type InternalAccount } from '@metamask/keyring-internal-api';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../util/navigation';

export type AddressListProps = StackScreenProps<
  RootParamList,
  'MultichainAddressList'
>;

export interface AddressItem {
  scope: CaipChainId;
  networkName: string;
  account: InternalAccount;
}
