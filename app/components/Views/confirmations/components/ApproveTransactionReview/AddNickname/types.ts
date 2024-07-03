import { AddressBookState } from '@metamask/address-book-controller';
import { NetworkType } from '@metamask/controller-utils';
import { InternalAccount } from '@metamask/keyring-api';
import type { NetworkState } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';

export interface AddNicknameProps {
  closeModal: () => void;
  address: string;
  addressNickname: string;
  networkConfigurations: NetworkState['networkConfigurations'];
  nicknameExists: boolean;
  showModalAlert: (config: any) => void;
  providerType: NetworkType;
  providerChainId: Hex;
  providerNetwork: string;
  providerRpcTarget: string;
  addressBook: AddressBookState['addressBook'];
  internalAccounts: InternalAccount[];
}
