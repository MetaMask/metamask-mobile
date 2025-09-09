import { AccountGroupId } from '@metamask/account-api';
import { type CaipChainId } from '@metamask/utils';
import { type InternalAccount } from '@metamask/keyring-internal-api';

export type PrivateKeyListParams = {
  title: string;
  groupId: AccountGroupId;
};

export interface AddressItem {
  scope: CaipChainId;
  networkName: string;
  account: InternalAccount;
}
