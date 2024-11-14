import { AddressBookControllerState } from '@metamask/address-book-controller';
import { NetworkType } from '@metamask/controller-utils';
import { InternalAccount } from '@metamask/keyring-api';
import type { NetworkState } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';

export interface AddNicknameProps {
  closeModal: () => void;
  address: string;
  addressNickname: string;
  networkConfigurations: NetworkState['networkConfigurationsByChainId'];
  nicknameExists: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showModalAlert: (config: any) => void;
  providerType: NetworkType;
  providerChainId: Hex;
  providerNetwork: string;
  providerRpcTarget: string;
  addressBook: AddressBookControllerState['addressBook'];
  internalAccounts: InternalAccount[];
}
