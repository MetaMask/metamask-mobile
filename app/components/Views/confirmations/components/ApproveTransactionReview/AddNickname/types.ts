import type { NetworkState } from '@metamask/network-controller';

export interface AddNicknameProps {
  closeModal: () => void;
  address: string;
  addressNickname: string;
  networkConfigurations: NetworkState['networkConfigurations'];
  nicknameExists: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  identities: any;
}
