export interface AddNicknameProps {
  closeModal: () => void;
  address: string;
  addressNickname: string;
  nicknameExists: boolean;
  showModalAlert: (config: any) => void;
  networkState: {
    provider: {
      type: string;
      chainId: string;
    };
    network: number;
  };
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
