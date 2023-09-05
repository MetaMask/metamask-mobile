import type { NetworkState } from '@metamask/network-controller';

export interface AddNicknameProps {
  closeModal: () => void;
  address: string;
  addressNickname: string;
  networkConfigurations: NetworkState['networkConfigurations'];
  nicknameExists: boolean;
  showModalAlert: (config: any) => void;
  providerType: string;
  providerChainId: string;
  providerNetwork: string;
  providerRpcTarget?: string;
  addressBook: {
    [key: string]: {
      address: string;
      chainId: string;
      memo: string;
      name: string;
    };
  };
  identities: any;
}
