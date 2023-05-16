export interface AddNicknameProps {
  closeModal: () => void;
  address: string;
  addressNickname: string;
  frequentRpcList: any;
  nicknameExists: boolean;
  showModalAlert: (config: any) => void;
  providerType: string;
  providerChainId: string;
  providerNetwork: number;
  providerRpcTarget: string;
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
